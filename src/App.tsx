import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

type TipoJuego = 'normal' | 'reventado' | 'nica'
type Rol = 'admin' | 'cajero' | null

interface LineaApuesta {
  numero: string
  monto: number
  tipo: TipoJuego
  montoJG?: number
}

interface Venta {
  id: string
  cliente_nombre: string
  cliente_telefono: string
  lineas: LineaApuesta[]
  total: number
  puesto: string
  created_at: string
}

function App() {
  const [rol, setRol] = useState<Rol>(null)
  const [usuario, setUsuario] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [vista, setVista] = useState<'venta' | 'admin'>('venta')
  
  const [cliente, setCliente] = useState('')
  const [telefono, setTelefono] = useState('')
  const [numero, setNumero] = useState('')
  const [monto, setMonto] = useState('')
  const [tipo, setTipo] = useState<TipoJuego>('normal')
  const [montoJG, setMontoJG] = useState('')
  const [lineas, setLineas] = useState<LineaApuesta[]>([])
  const [ultimaVenta, setUltimaVenta] = useState<Venta | null>(null)
  const [ventasHoy, setVentasHoy] = useState<Venta[]>([])
  const [ganadores, setGanadores] = useState<any[]>([])

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (rol) cargarVentas()
  }, [rol])

  const checkUser = async () => {
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      const { data: perfil } = await supabase
       .from('usuarios')
       .select('*')
       .eq('id', data.user.id)
       .single()
      if (perfil) {
        setUsuario(perfil)
        setRol(perfil.rol)
      }
    }
  }

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert('Error: ' + error.message)
    else checkUser()
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setRol(null)
    setUsuario(null)
  }

  const agregarLinea = () => {
    if (!numero ||!monto) return alert('Llená número y monto')
    if (numero.length!== 2) return alert('Número debe ser 2 dígitos')
    
    const nuevaLinea: LineaApuesta = {
      numero,
      monto: parseFloat(monto),
      tipo,
      montoJG: tipo === 'nica' && montoJG? parseFloat(montoJG) : undefined
    }
    setLineas([...lineas, nuevaLinea])
    setNumero('')
    setMonto('')
    setMontoJG('')
  }

  const calcularTotal = () => {
    return lineas.reduce((sum, l) => sum + l.monto + (l.montoJG || 0), 0)
  }

  const guardarVenta = async () => {
    if (!cliente) return alert('Poné el nombre del cliente')
    if (lineas.length === 0) return alert('Agregá al menos una apuesta')
    
    const venta = {
      cliente_nombre: cliente,
      cliente_telefono: telefono,
      lineas: lineas,
      total: calcularTotal(),
      puesto: usuario.puesto,
      usuario_id: usuario.id
    }
    
    const { data, error } = await supabase
     .from('ventas')
     .insert(venta)
     .select()
     .single()
    
    if (error) return alert('Error: ' + error.message)
    
    setUltimaVenta(data)
    setLineas([])
    setCliente('')
    setTelefono('')
    cargarVentas()
  }

  const cargarVentas = async () => {
    const hoy = new Date().toISOString().split('T')[0]
    const { data } = await supabase
     .from('ventas')
     .select('*')
     .gte('created_at', hoy)
     .order('created_at', { ascending: false })
    if (data) setVentasHoy(data)
  }

  const cerrarSorteo = async (sorteo: string, numeroGanador: string) => {
    const { error } = await supabase.from('sorteos').insert({
      sorteo,
      numero_ganador: numeroGanador,
      cerrado_por: usuario.id
    })
    if (error) return alert('Error: ' + error.message)
    alert(`Sorteo ${sorteo} cerrado con número ${numeroGanador}`)
    buscarGanadores(sorteo, numeroGanador)
  }

  const buscarGanadores = async (sorteo: string, numero: string) => {
    const { data } = await supabase
     .from('ventas')
     .select('*')
     .contains('lineas', [{ numero }])
    if (data) setGanadores(data)
  }

  const imprimirTiquete = () => window.print()

  const mandarWhatsApp = () => {
    if (!ultimaVenta) return
    let texto = `*TIEMPOS REY* 👑\n`
    texto += `Puesto: ${ultimaVenta.puesto}\n`
    texto += `Cliente: ${ultimaVenta.cliente_nombre}\n`
    texto += `Fecha: ${new Date(ultimaVenta.created_at).toLocaleString('es-CR')}\n`
    texto += `----------------\n`
    ultimaVenta.lineas.forEach(l => {
      if (l.tipo === 'normal') texto += `Num ${l.numero} - ₡${l.monto} (85x)\n`
      if (l.tipo === 'reventado') texto += `Num ${l.numero} - ₡${l.monto} REV (200x)\n`
      if (l.tipo === 'nica') {
        texto += `Num ${l.numero} - ₡${l.monto} NICA\n`
        if (l.montoJG) texto += ` + JG ₡${l.montoJG} (85x/200x)\n`
      }
    })
    texto += `----------------\n`
    texto += `*TOTAL: ₡${ultimaVenta.total}*\n`
    texto += `Ticket: ${ultimaVenta.id.slice(0,8)}\n`
    texto += `Gracias por su compra`
    
    const url = `https://wa.me/506${ultimaVenta.cliente_telefono}?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
  }

  if (!rol) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md">
          <h1 className="text-3xl font-bold text-yellow-500 mb-6 text-center">TIEMPOS REY 👑</h1>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full p-3 mb-4 bg-gray-700 text-white rounded"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full p-3 mb-4 bg-gray-700 text-white rounded"
          />
          <button
            onClick={login}
            className="w-full bg-yellow-500 text-gray-900 font-bold p-3 rounded hover:bg-yellow-400"
          >
            ENTRAR
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="no-print bg-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-yellow-500">TIEMPOS REY 👑</h1>
        <div className="flex gap-4 items-center">
          <span className="text-sm">{usuario?.puesto} - {rol}</span>
          {rol === 'admin' && (
            <button
              onClick={() => setVista(vista === 'venta'? 'admin' : 'venta')}
              className="bg-blue-600 px-4 py-2 rounded"
            >
              {vista === 'venta'? 'Panel Admin' : 'Ventas'}
            </button>
          )}
          <button onClick={logout} className="bg-red-600 px-4 py-2 rounded">Salir</button>
        </div>
      </div>

      {vista === 'venta'? (
        <div className="p-4 max-w-6xl mx-auto grid md:grid-cols-2 gap-4">
          <div className="no-print bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Nueva Venta</h2>
            
            <input
              placeholder="Nombre Cliente"
              value={cliente}
              onChange={e => setCliente(e.target.value)}
              className="w-full p-3 mb-3 bg-gray-700 rounded"
            />
            <input
              placeholder="Teléfono (8 dígitos)"
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              className="w-full p-3 mb-3 bg-gray-700 rounded"
            />
            
            <div className="flex gap-2 mb-3">
              <input
                placeholder="Número (00-99)"
                maxLength={2}
                value={numero}
                onChange={e => setNumero(e.target.value)}
                className="flex-1 p-3 bg-gray-700 rounded text-center text-2xl"
              />
              <input
                placeholder="Monto"
                type="number"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                className="flex-1 p-3 bg-gray-700 rounded"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <button
                onClick={() => setTipo('normal')}
                className={`p-3 rounded ${tipo === 'normal'? 'bg-yellow-500 text-gray-900' : 'bg-gray-700'}`}
              >
                Normal 85x
              </button>
              <button
                onClick={() => setTipo('reventado')}
                className={`p-3 rounded ${tipo === 'reventado'? 'bg-yellow-500 text-gray-900' : 'bg-gray-700'}`}
              >
                Reventado 200x
              </button>
              <button
                onClick={() => setTipo('nica')}
                className={`p-3 rounded ${tipo === 'nica'? 'bg-yellow-500 text-gray-900' : 'bg-gray-700'}`}
              >
                Nica
              </button>
            </div>

            {tipo === 'nica' && (
              <input
                placeholder="Monto JG (opcional)"
                type="number"
                value={montoJG}
                onChange={e => setMontoJG(e.target.value)}
                className="w-full p-3 mb-3 bg-gray-700 rounded"
              />
            )}
export default App
