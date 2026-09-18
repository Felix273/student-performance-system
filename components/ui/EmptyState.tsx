import Link from "next/link"

interface Props {
  icon: string
  title: string
  description: string
  actionText?: string
  actionHref?: string
}

export default function EmptyState({ icon, title, description, actionText, actionHref }: Props) {
  return (
    <div className="text-center py-12 px-4">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
      {actionText && actionHref && (
        <Link
          href={actionHref}
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
        >
          {actionText}
        </Link>
      )}
    </div>
  )
}
