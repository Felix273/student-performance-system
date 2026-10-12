#!/usr/bin/env python3
"""
KICD CBC blueprint scraper
==========================
Builds a structured dataset of the Kenyan CBC curriculum from kicd.ac.ke
to seed a school management system.

Pipeline (each step is a CLI flag, run them in order):
  1. --crawl      Discover grade pages + every curriculum-design PDF link
                  -> data/manifest.json
  2. --download   Download the PDFs from Google Drive
                  -> data/pdfs/<level>/<grade>/<category>/<file_id>.pdf
  3. --parse      Extract strands / sub-strands / outcomes / experiences /
                  inquiry questions / rubrics from the PDFs
                  -> data/curriculum/<grade>.json
  4. --emit-schema Write a PostgreSQL schema blueprint -> schema.sql

Install:
  pip install requests beautifulsoup4 pdfplumber

Notes
  * The designs are PDFs hosted on Google Drive; KICD's page only lists the
    links (no titles), so the learning-area name is read from each PDF.
  * PDF table parsing is heuristic. ALWAYS spot-check the JSON output and
    expect to clean some rows by hand. Keep the raw text next to the parsed
    rows (we do) so you can re-parse without re-downloading.
  * Be polite: the script sleeps between requests. Check KICD's terms before
    redistributing the content itself.
"""
import argparse
import json
import re
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

BASE = "https://kicd.ac.ke"
INDEX = f"{BASE}/cbc-materials/curriculum-designs/"
EXTRA_PAGES = [  # level pages that sit outside the /curriculum-designs/<grade>/ tree
    f"{BASE}/cbc-materials/pre-primary/",
    f"{BASE}/cbc-materials/lower-primary/",
    f"{BASE}/curriculum-reform/basic-education-curriculum-framework/",
]
DATA = Path("data")
DELAY = 1.5  # seconds between requests
HEADERS = {"User-Agent": "cbc-blueprint-scraper/1.0 (education research; contact: you@example.com)"}

# CBC structure (Basic Education Curriculum Framework). Verify against the
# framework page/PDF that --crawl also captures.
LEVELS = {
    "pre-primary": ["PP1", "PP2"],
    "lower-primary": ["Grade 1", "Grade 2", "Grade 3"],
    "upper-primary": ["Grade 4", "Grade 5", "Grade 6"],
    "junior-school": ["Grade 7", "Grade 8", "Grade 9"],
    "senior-school": ["Grade 10", "Grade 11", "Grade 12"],
}
PATHWAYS = ["STEM", "Social Sciences", "Arts & Sports Science"]
RATING_LEVELS = ["Exceeds Expectations", "Meets Expectations",
                 "Approaches Expectations", "Below Expectations"]

session = requests.Session()
session.headers.update(HEADERS)


# ----------------------------------------------------------------- helpers
def get(url, **kw):
    time.sleep(DELAY)
    r = session.get(url, timeout=60, **kw)
    r.raise_for_status()
    return r


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def level_of(grade_label):
    for level, grades in LEVELS.items():
        if grade_label in grades:
            return level
    return "unknown"


GRADE_WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
               "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12}


def grade_from_text(text):
    t = text.lower()
    if "pp1" in t or "pp 1" in t:
        return "PP1"
    if "pp2" in t or "pp 2" in t:
        return "PP2"
    m = re.search(r"grade\s*(\d{1,2})", t)
    if m:
        return f"Grade {int(m.group(1))}"
    for w, n in GRADE_WORDS.items():
        if re.search(rf"grade\s*{w}\b", t) or re.search(rf"\b{w}\s+designs?\b", t):
            return f"Grade {n}"
    return None


# ------------------------------------------------------------------ crawl
def discover_pages(include_sne=False):
    """Return {url: label} for every page that may list design PDFs."""
    soup = BeautifulSoup(get(INDEX).text, "html.parser")
    pages = {}
    for a in soup.select("a[href]"):
        href = urljoin(BASE, a["href"]).split("#")[0]
        if "/cbc-materials/curriculum-designs/" not in href:
            continue
        if href.rstrip("/") == INDEX.rstrip("/"):
            continue
        if "/sne-curriculum-designs/" in href and not include_sne:
            continue
        pages[href] = a.get_text(strip=True)
    for u in EXTRA_PAGES:
        pages.setdefault(u, u.rstrip("/").split("/")[-1])
    return pages


def parse_design_page(url, label):
    """Each page = headings (category) followed by Google Drive embeds/links."""
    soup = BeautifulSoup(get(url).text, "html.parser")
    main = soup.find("main") or soup.find("div", class_=re.compile("content|entry", re.I)) or soup
    grade = grade_from_text(label) or grade_from_text(url) or label
    category = "General"
    rows = []
    for el in main.find_all(["h2", "h3", "h4", "a", "iframe", "embed"]):
        if el.name in ("h2", "h3", "h4"):
            txt = el.get_text(strip=True)
            if txt and not txt.lower().startswith(("grade", "listen")):
                category = txt
        else:
            href = el.get("href") or el.get("src") or ""
            m = re.search(r"drive\.google\.com/file/d/([\w-]+)", href)
            pdf_direct = href.lower().endswith(".pdf")
            if m or pdf_direct:
                file_id = m.group(1) if m else None
                rows.append({
                    "page": url,
                    "grade": grade,
                    "level": level_of(grade),
                    "category": category,
                    "link_text": el.get_text(strip=True) or (el.get("title") or "Google Drive PDF"),
                    "file_id": file_id,
                    "url": href if pdf_direct else
                           f"https://drive.google.com/uc?export=download&id={file_id}",
                })
    return rows


def crawl(include_sne=False):
    DATA.mkdir(exist_ok=True)
    pages = discover_pages(include_sne)
    manifest, seen = [], set()
    for url, label in pages.items():
        print("crawl:", label, url)
        try:
            for row in parse_design_page(url, label):
                key = row["file_id"] or row["url"]
                if key not in seen:
                    seen.add(key)
                    manifest.append(row)
        except Exception as e:  # keep going on a bad page
            print("  !! failed:", e)
    (DATA / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"manifest.json: {len(manifest)} design files from {len(pages)} pages")


# --------------------------------------------------------------- download
def is_blocked_google_drive_response(response):
    ctype = response.headers.get("Content-Type", "")
    body = (response.text or "").lower()
    if "text/html" not in ctype:
        return False
    blocked = (
        "can&#39;t download file" in body or
        "only the owner and editors can download this file" in body or
        "the owner hasn't given you permission to download this file" in body or
        "permission to download this file" in body or
        "this file is not available for download" in body
    )
    return blocked


def looks_like_pdf(path):
    try:
        with open(path, "rb") as f:
            return f.read(5) == b"%PDF-"
    except OSError:
        return False


def fetch_drive_pdf(row, dest):
    """Google Drive may serve a permission or confirmation page instead of a PDF."""
    url = row["url"]
    if "drive.google.com/file/d/" in url and "/preview" in url:
        file_id = re.search(r"drive\.google\.com/file/d/([\w-]+)", url).group(1)
        url = f"https://drive.google.com/uc?export=download&id={file_id}"
    r = get(url, stream=True)
    if is_blocked_google_drive_response(r):
        raise PermissionError(f"Google Drive blocked this file: {url}")
    if "text/html" in r.headers.get("Content-Type", ""):
        html = r.text
        m = re.search(r'href="(/uc\?export=download[^"]+)"', html) or \
            re.search(r'action="([^"]+)"', html)
        if m:
            retry_url = urljoin("https://drive.google.com", m.group(1).replace("&amp;", "&"))
            r = get(retry_url, stream=True)
            if is_blocked_google_drive_response(r):
                raise PermissionError(f"Google Drive blocked this file: {retry_url}")
    if "text/html" in r.headers.get("Content-Type", "") and not r.content.startswith(b"%PDF"):
        raise ValueError(f"Downloaded content is not a PDF: {url}")
    with open(dest, "wb") as f:
        for chunk in r.iter_content(1 << 16):
            f.write(chunk)


def download():
    manifest = json.loads((DATA / "manifest.json").read_text())
    for row in manifest:
        out = DATA / "pdfs" / row["level"] / slug(row["grade"]) / slug(row["category"])
        out.mkdir(parents=True, exist_ok=True)
        name = (row["file_id"] or slug(urlparse(row["url"]).path.split("/")[-1])) + ".pdf"
        dest = out / name
        row["local_path"] = str(dest)
        if dest.exists() and dest.stat().st_size > 1000:
            if looks_like_pdf(dest):
                continue
            print("  !! removing stale non-PDF cache:", dest)
            dest.unlink()
        print("download:", row["grade"], row["category"], name)
        try:
            fetch_drive_pdf(row, dest)
        except PermissionError as e:
            print("  !! blocked:", e)
            if dest.exists():
                dest.unlink()
        except Exception as e:
            print("  !! failed:", e)
            if dest.exists():
                dest.unlink()
    (DATA / "manifest.json").write_text(json.dumps(manifest, indent=2))


# ------------------------------------------------------------------ parse
# Column header -> canonical field. KICD design tables use these headings.
COLS = {
    "strand": "strand",
    "sub strand": "sub_strand", "substrand": "sub_strand", "sub-strand": "sub_strand",
    "specific learning outcomes": "outcomes", "learning outcomes": "outcomes",
    "suggested learning experiences": "experiences", "learning experiences": "experiences",
    "key inquiry question": "inquiry_questions", "key inquiry questions": "inquiry_questions",
    "core competencies": "core_competencies",
    "values": "values", "pertinent and contemporary issues": "pcis", "pcis": "pcis",
    "link to other learning areas": "links",
    "suggested community service learning activities": "csl_activities",
}


def norm(s):
    return re.sub(r"\s+", " ", (s or "").replace("\n", " ")).strip()


def split_items(text):
    """Turn a bulleted/numbered cell into a list."""
    parts = re.split(r"(?:^|\s)(?:[•\-–●▪]|\(?[a-z0-9]{1,2}[\).])\s+", text or "")
    items = [norm(p) for p in parts if norm(p)]
    return items or ([norm(text)] if norm(text) else [])


def parse_pdf(path):
    import pdfplumber
    doc = {"file": str(path), "learning_area": None, "essence_statement": None,
           "general_outcomes": [], "rows": [], "rubrics": [], "raw_text_head": ""}
    with pdfplumber.open(path) as pdf:
        text_pages = [(p.extract_text() or "") for p in pdf.pages]
        full = "\n".join(text_pages)
        doc["raw_text_head"] = full[:3000]

        # learning area name: first line after the cover that has no digits/KICD boilerplate
        for line in full.splitlines()[:40]:
            l = norm(line)
            if 4 < len(l) < 80 and not re.search(r"kenya|institute|copyright|first published|isbn|grade \d+$", l, re.I):
                doc["learning_area"] = l
                break

        m = re.search(r"ESSENCE STATEMENT\s*(.+?)(?:\n[A-Z ]{8,}\n|GENERAL LEARNING OUTCOMES)", full, re.S | re.I)
        if m:
            doc["essence_statement"] = norm(m.group(1))[:2000]
        m = re.search(r"GENERAL LEARNING OUTCOMES?\s*(.+?)(?:\n[A-Z ]{8,}\n|SUMMARY OF STRANDS)", full, re.S | re.I)
        if m:
            doc["general_outcomes"] = split_items(m.group(1))

        # tables
        carry = {"strand": None, "sub_strand": None}
        for page in pdf.pages:
            for table in page.extract_tables():
                if not table or len(table) < 2:
                    continue
                header = [COLS.get(norm(c).lower().rstrip(":")) for c in table[0]]
                is_rubric = any("expectation" in norm(c).lower() for c in table[0] if c)
                if is_rubric:
                    doc["rubrics"].append([[norm(c) for c in r] for r in table])
                    continue
                if not any(header):
                    continue
                for r in table[1:]:
                    row = {}
                    for field, cell in zip(header, r):
                        if not field:
                            continue
                        row[field] = norm(cell)
                    # merged cells come through empty -> carry forward
                    for k in ("strand", "sub_strand"):
                        if row.get(k):
                            carry[k] = row[k]
                            if k == "strand":
                                carry["sub_strand"] = row.get("sub_strand") or None
                        else:
                            row[k] = carry[k]
                    for k in ("outcomes", "experiences", "inquiry_questions"):
                        if k in row:
                            row[k] = split_items(row[k])
                    if row.get("outcomes") or row.get("experiences"):
                        doc["rows"].append(row)
    return doc


def parse():
    manifest = json.loads((DATA / "manifest.json").read_text())
    out_dir = DATA / "curriculum"
    out_dir.mkdir(exist_ok=True)
    by_grade = {}
    valid_pdf_count = 0
    for row in manifest:
        p = row.get("local_path")
        if not p or not Path(p).exists():
            continue
        try:
            doc = parse_pdf(p)
        except Exception as e:
            print("  !! parse failed:", p, e)
            continue
        doc.update(grade=row["grade"], level=row["level"], category=row["category"])
        by_grade.setdefault(row["grade"], []).append(doc)
        valid_pdf_count += 1
        print("parsed:", row["grade"], "|", doc["learning_area"], "|", len(doc["rows"]), "rows")
    if valid_pdf_count == 0:
        print("No valid curriculum PDFs were available for parsing; full curriculum import deferred pending a downloadable source.")
        return
    for grade, docs in by_grade.items():
        (out_dir / f"{slug(grade)}.json").write_text(json.dumps(docs, indent=2, ensure_ascii=False))


# ----------------------------------------------------------------- schema
SCHEMA = """
-- CBC school system: PostgreSQL blueprint (adapt for Supabase RLS per tenant)

-- ===== Curriculum (seeded from the scraper; global, read-only for schools) =====
CREATE TABLE education_level (
  id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, sort_order INT NOT NULL
);  -- Pre-Primary, Lower Primary, Upper Primary, Junior School, Senior School

CREATE TABLE grade (
  id SERIAL PRIMARY KEY, level_id INT REFERENCES education_level(id),
  name TEXT UNIQUE NOT NULL, sort_order INT NOT NULL   -- PP1, PP2, Grade 1 ... Grade 12
);

CREATE TABLE pathway (            -- Senior School only
  id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL     -- STEM, Social Sciences, Arts & Sports Science
);

CREATE TABLE learning_area (      -- a.k.a. subject
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, category TEXT,   -- e.g. Pure Sciences
  pathway_id INT REFERENCES pathway(id), is_core BOOLEAN DEFAULT FALSE
);

CREATE TABLE grade_learning_area (
  grade_id INT REFERENCES grade(id), learning_area_id INT REFERENCES learning_area(id),
  lessons_per_week INT, essence_statement TEXT, source_file TEXT,
  PRIMARY KEY (grade_id, learning_area_id)
);

CREATE TABLE strand (
  id SERIAL PRIMARY KEY, grade_id INT, learning_area_id INT, name TEXT NOT NULL, sort_order INT,
  FOREIGN KEY (grade_id, learning_area_id) REFERENCES grade_learning_area
);
CREATE TABLE sub_strand (
  id SERIAL PRIMARY KEY, strand_id INT REFERENCES strand(id), name TEXT NOT NULL,
  suggested_lessons INT, sort_order INT
);
CREATE TABLE learning_outcome (
  id SERIAL PRIMARY KEY, sub_strand_id INT REFERENCES sub_strand(id), code TEXT, description TEXT NOT NULL
);
CREATE TABLE learning_experience (
  id SERIAL PRIMARY KEY, sub_strand_id INT REFERENCES sub_strand(id), description TEXT NOT NULL
);
CREATE TABLE inquiry_question (
  id SERIAL PRIMARY KEY, sub_strand_id INT REFERENCES sub_strand(id), question TEXT NOT NULL
);
CREATE TABLE core_competency (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL);
CREATE TABLE value (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL);

-- Assessment rubric: one row per (outcome, rating level)
CREATE TABLE rating_level (
  id SERIAL PRIMARY KEY, code TEXT UNIQUE, name TEXT, points INT   -- EE=4, ME=3, AE=2, BE=1
);
CREATE TABLE rubric (
  id SERIAL PRIMARY KEY, learning_outcome_id INT REFERENCES learning_outcome(id),
  rating_level_id INT REFERENCES rating_level(id), descriptor TEXT NOT NULL
);

-- ===== Tenant data (per school; add school_id + RLS on everything below) =====
CREATE TABLE school (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, knec_code TEXT,
  county TEXT, sub_county TEXT, ownership TEXT   -- public / private / sponsored
);
CREATE TABLE academic_year (id SERIAL PRIMARY KEY, school_id UUID, year INT, is_current BOOLEAN);
CREATE TABLE term (id SERIAL PRIMARY KEY, academic_year_id INT, number INT CHECK (number BETWEEN 1 AND 3),
                   start_date DATE, end_date DATE);
CREATE TABLE class_stream (id SERIAL PRIMARY KEY, school_id UUID, grade_id INT, stream TEXT, academic_year_id INT);

CREATE TABLE learner (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID, admission_no TEXT,
  upi TEXT,                       -- NEMIS Unique Personal Identifier
  assessment_no TEXT,             -- KNEC assessment number
  first_name TEXT, last_name TEXT, dob DATE, gender TEXT,
  pathway_id INT, special_needs_notes TEXT, status TEXT DEFAULT 'active'
);
CREATE TABLE guardian (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID, name TEXT, phone TEXT, email TEXT);
CREATE TABLE learner_guardian (learner_id UUID, guardian_id UUID, relationship TEXT, is_primary BOOLEAN);
CREATE TABLE enrolment (learner_id UUID, class_stream_id INT, academic_year_id INT, PRIMARY KEY (learner_id, academic_year_id));

CREATE TABLE teacher (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID, tsc_no TEXT, name TEXT, phone TEXT);
CREATE TABLE teaching_assignment (teacher_id UUID, class_stream_id INT, learning_area_id INT, term_id INT);

-- Assessments (formative + summative + SBA + projects)
CREATE TABLE assessment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID, class_stream_id INT, learning_area_id INT,
  term_id INT, type TEXT,         -- formative | summative | sba | project | cat | end_term
  title TEXT, date DATE
);
CREATE TABLE assessment_result (
  assessment_id UUID, learner_id UUID, sub_strand_id INT, rating_level_id INT,
  score NUMERIC, teacher_comment TEXT, PRIMARY KEY (assessment_id, learner_id, sub_strand_id)
);
CREATE TABLE competency_observation (learner_id UUID, core_competency_id INT, term_id INT, rating_level_id INT, note TEXT);
CREATE TABLE csl_project (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID, learner_id UUID, title TEXT, hours NUMERIC, term_id INT, rating_level_id INT);
CREATE TABLE report_card (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), learner_id UUID, term_id INT, generated_at TIMESTAMPTZ, pdf_url TEXT);

-- Scheme of work / lesson plan (generated from strands + sub-strands)
CREATE TABLE scheme_of_work (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), teacher_id UUID, class_stream_id INT, learning_area_id INT, term_id INT);
CREATE TABLE scheme_row (scheme_id UUID, week INT, lesson INT, sub_strand_id INT, learning_outcome_id INT, experiences TEXT, resources TEXT, assessment TEXT, remarks TEXT);

-- Fees & comms (Kenya integrations: M-Pesa Daraja, Africa's Talking)
CREATE TABLE fee_structure (id SERIAL PRIMARY KEY, school_id UUID, grade_id INT, term_id INT, item TEXT, amount NUMERIC);
CREATE TABLE fee_payment (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), learner_id UUID, term_id INT, amount NUMERIC, method TEXT, mpesa_receipt TEXT, paid_at TIMESTAMPTZ);
CREATE TABLE attendance (learner_id UUID, date DATE, status TEXT, PRIMARY KEY (learner_id, date));
CREATE TABLE sms_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID, to_phone TEXT, body TEXT, status TEXT, sent_at TIMESTAMPTZ);
"""


def emit_schema():
    Path("schema.sql").write_text(SCHEMA.strip() + "\n")
    print("wrote schema.sql")


# -------------------------------------------------------------------- cli
if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--crawl", action="store_true")
    ap.add_argument("--download", action="store_true")
    ap.add_argument("--parse", action="store_true")
    ap.add_argument("--emit-schema", action="store_true")
    ap.add_argument("--include-sne", action="store_true", help="also crawl Special Needs Education designs")
    a = ap.parse_args()
    if a.crawl:
        crawl(a.include_sne)
    if a.download:
        download()
    if a.parse:
        parse()
    if a.emit_schema:
        emit_schema()
    if not any([a.crawl, a.download, a.parse, a.emit_schema]):
        ap.print_help()
