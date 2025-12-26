import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import ProjectManagement from '@/components/projects/ProjectManagement'
import { prisma } from '@/lib/db'

export default async function CustomerProjectsPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch customer data
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
  })

  if (!customer) {
    redirect('/customers')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <a href="/customers" className="text-gray-600 hover:text-gray-900">
                ← Kembali
              </a>
              <h1 className="text-xl font-bold text-gray-900">Proyek Pelanggan</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="w-full py-6 sm:px-6 lg:px-8">
        <ProjectManagement customerId={params.id} customer={customer} />
      </main>
    </div>
  )
}

