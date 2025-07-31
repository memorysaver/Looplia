import { createFileRoute } from '@tanstack/react-router'
import { NewsLayout } from '@/components/layout/NewsLayout'
import { NewsFeed } from '@/components/news/NewsFeed'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <NewsLayout>
      {({ searchQuery }: { searchQuery: string }) => (
        <NewsFeed searchQuery={searchQuery} />
      )}
    </NewsLayout>
  )
}
