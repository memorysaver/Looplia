import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="max-w-4xl mx-auto text-center px-4">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Welcome to ACME
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Your modern full-stack application template. Built with TanStack Start, 
          Cloudflare Workers, and Shadcn UI.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 justify-center mb-12 max-w-4xl mx-auto">
          <Link to="/landing-demo">
            <Button size="lg" className="w-full">
              Landing Demo
            </Button>
          </Link>
          <Link to="/dashboard-demo">
            <Button variant="outline" size="lg" className="w-full">
              Dashboard Demo
            </Button>
          </Link>
          <Link to="/login-demo">
            <Button variant="outline" size="lg" className="w-full">
              Login Demo
            </Button>
          </Link>
          <Link to="/trpc-demo">
            <Button variant="outline" size="lg" className="w-full">
              tRPC Demo
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div className="p-6 bg-white rounded-lg shadow-sm border">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              🚀
            </div>
            <h3 className="text-lg font-semibold mb-2">Modern Stack</h3>
            <p className="text-gray-600 text-sm">
              TanStack Start, Cloudflare Workers, tRPC, and Shadcn UI
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-lg shadow-sm border">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              ⚡
            </div>
            <h3 className="text-lg font-semibold mb-2">Serverless</h3>
            <p className="text-gray-600 text-sm">
              Deploy globally with Cloudflare's edge network
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-lg shadow-sm border">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              🎨
            </div>
            <h3 className="text-lg font-semibold mb-2">Ready to Use</h3>
            <p className="text-gray-600 text-sm">
              Complete pages and components ready for customization
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
