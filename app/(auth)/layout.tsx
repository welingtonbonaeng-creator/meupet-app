export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-green-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4 shadow-lg">
            <span className="text-3xl">🐾</span>
          </div>
          <h1 className="text-3xl font-bold text-white">MeuPet<span className="text-blue-200">+</span></h1>
          <p className="text-blue-100 text-sm mt-1">Cuidado inteligente para seu pet</p>
        </div>
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8">{children}</div>
      </div>
    </div>
  )
}
