'use client'
import Link from 'next/link'
import { usePets } from '@/hooks/usePets'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { petAge, weightStatus, speciesEmoji } from '@/lib/utils'
import { Plus, ChevronRight } from 'lucide-react'

export default function PetsPage() {
  const { pets, loading } = usePets()

  return (
    <div>
      <TopBar title="Meus Pets" subtitle={`${pets.length} pet${pets.length !== 1 ? 's' : ''} cadastrado${pets.length !== 1 ? 's' : ''}`} />

      <div className="p-4 lg:p-6 max-w-2xl">
        <div className="flex justify-end mb-4">
          <Link href="/pets/novo">
            <Button className="gap-2"><Plus size={16} /> Novo pet</Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : pets.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-5xl mb-4">🐾</div>
              <h3 className="font-bold text-slate-700 mb-2">Nenhum pet ainda</h3>
              <p className="text-slate-500 text-sm mb-6">Cadastre seu primeiro pet para começar a acompanhar a saúde dele</p>
              <Link href="/pets/novo"><Button size="lg">Cadastrar primeiro pet</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pets.map(pet => {
              const ws = pet.weight_kg && pet.ideal_weight ? weightStatus(pet.weight_kg, pet.ideal_weight) : null
              return (
                <Link key={pet.id} href={`/pets/${pet.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-3xl flex-shrink-0">
                          {pet.photo_url
                            ? <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                            : speciesEmoji(pet.species)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 text-base">{pet.name}</span>
                            {pet.sex && (
                              <Badge variant="info" className="text-xs">
                                {pet.sex === 'male' ? '♂ Macho' : '♀ Fêmea'}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-slate-500 mt-0.5">
                            {pet.breed || pet.species}
                            {pet.birth_date ? ` · ${petAge(pet.birth_date)}` : ''}
                          </div>
                          {pet.weight_kg && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-400">{pet.weight_kg} kg</span>
                              {ws && <span className={`text-xs font-medium ${ws.color}`}>{ws.icon} {ws.label}</span>}
                            </div>
                          )}
                        </div>
                        <ChevronRight size={18} className="text-slate-300 flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
