import { ReactNode, useState } from 'react'
import { IconSidebar } from './IconSidebar'
import { CleanHeader } from './CleanHeader'

interface NewsLayoutProps {
  children: ReactNode
}

export function NewsLayout({ children }: NewsLayoutProps) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen bg-white">
      <IconSidebar />
      <div className="pl-[50px] lg:pl-[70px]">
        <CleanHeader 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <main className="bg-gray-50">
          {typeof children === 'function' ? children({ searchQuery }) : children}
        </main>
      </div>
    </div>
  )
}