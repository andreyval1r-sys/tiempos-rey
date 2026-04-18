import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

function App() {
  const [sorteos, setSorteos] = useState([])
  const [sorteoId, setSorteoId] = useState('')
  const [numero, setNumero] = useState('')
  const [monto, setMonto] = useState('')
  const [condicion, setCondicion] = useState('Contado')
  const [cliente, setCliente] = useState('')
  const [ventas, setVentas] = useState([])
  const [restricciones, setRestricciones] = useState([])
  const [tiquete, setTiquete] = useState('')
  const [balance, setBalance] = useState(0)

  useEffect(() => { cargarSorteos() }, [])

  useEffect(() => {
    if(sorteoId) {
      cargarVentas()
      cargarRestricciones()
      generarTiquete()
    }
  }, [sorteoId])

  async function cargarSorteos() {
    const { data } = await supabase.from('sorteos').select('*').eq('activo', true).order('id')
    setSorteos(data || [])
    if(data?.length > 0) setSorteoId(data[0].id)
  }

  async function cargarVentas() {
    const hoy = new Date().toISOString().split('T')[0]
    const { data } = await supabase
.from('ventas')
.select('*, sorteos(nombre)')
.eq('sorteo_id', sorteoId)
.gte('fecha', hoy)
.order('fecha', { ascending: false })
    setVentas(data || [])
    const total = (data || []).reduce((sum, v) => sum + v.monto, 0)
    const comi = (data || []).reduce((sum, v) => sum + v.comision, 0)
    setBalance(total - comi)
  }

  async function cargarRestricciones() {
    const { data } = await supabase
.from('restricciones')
.select('*')
.eq('sorteo_id', sorteoId)
    setRestricciones(data || [])
  }

  function generarTiquete() {
  setTiquete({
    numero: numero,
    monto: monto,
    sorteo: sorteos.find(s => s.id === sorteoId)?.nombre || '',
    condicion: condicion
  });
  }

  async function ingresarVenta() {
    if(!numero ||!monto ||!sorteoId) return alert('Llená número y monto')
    if(numero.length!== 2) return alert('Número debe ser de 2 dígitos: 00-99')
    
    const restriccion = restricciones.find(r => r.numero === numero)
    if(restriccion && parseInt(monto) > restriccion.max_monto) {
      return alert(`Número ${numero} restringido. Máximo: ₡${restriccion.max_monto}`)
    }

    const { error } = await supabase.from('ventas').insert({
      tiquete,
      sorteo_id: sorteoId,
      cliente: cliente || 'Anonimo',
      numero,
      monto: parseInt(monto)
    })
  setTiquete({
    numero: numero,
    monto: parseInt(monto),
    sorteo: sorteos.find(s => s.id === sorteoId)?.nombre || '',
    condicion: condicion
  });
    if(error) return alert('Error: ' + error.message)
    
    setNumero('')
    setMonto('')
    cargarVentas()
  }

  const totalVendido = ventas.reduce((sum, v) => sum + v.monto, 0)
  const comision = ventas.reduce((sum, v) => sum + v.comision, 0)
  
  const numerosMasVendidos = Object.entries(
    ventas.reduce((acc, v) => {
      acc[v.numero] = (acc[v.numero] || 0) + v.monto
      return acc
    }, {})
  ).sort((a,b) => b[1] - a[1]).slice(0,10)

  const sorteoActual = sorteos.find(s => s.id == sorteoId)
  const imprimirTiquete = () => {
    window.print();
  }

  const compartirWhatsApp = () => {
  if (!tiquete?.numero) return alert('Primero registre una venta');
  const texto = `*TIQUETE TIEMPOS REY*%0A%0ANúmero: ${tiquete.numero}%0AMonto: ₡${tiquete.monto}%0ASorteo: ${tiquete.sorteo}%0ACondición: ${tiquete.condicion}%0A%0AGracias por su compra`;
  window.open(`https://wa.me/?text=${texto}`, '_blank');
  }
  
  return (
    <div style={{background:'#0f172a', minHeight:'100vh', color:'white', fontFamily:'Arial'}}>
      <div style={{background:'#1e3a5f', padding:'12px 20px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h2 style={{margin:0}}>Gestor Web v4.0 | Tiempos</h2>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:'14px', color:'#94a3b8'}}>Balance</div>
          <div style={{fontSize:'24px', fontWeight:'bold', color:'#22c55e'}}>₡{balance.toLocaleString()}</div>
        </div>
      </div>
      
      <div style={{padding:'20px', maxWidth:'1400px', margin:'0 auto'}}>
        <div style={{display:'flex', gap:'20px', marginBottom:'20px', flexWrap:'wrap'}}>
          <div style={{flex:'2 1 300px'}}>
            <label style={{fontSize:'14px', color:'#94a3b8'}}>Sorteo:</label>
            <select value={sorteoId} onChange={e=>setSorteoId(e.target.value)} 
              style={{width:'100%', padding:'10px', background:'#1e293b', color:'white', border:'1px solid #334155', borderRadius:'4px', fontSize:'16px'}}>
              {sorteos.map(s => (
                <option key={s.id} value={s.id}>
                  {new Date().toLocaleDateString('es-CR')} {s.nombre}
                </option>
              ))}
            </select>
          </div>
          <div style={{flex:'1 1 200px'}}>
            <label style={{fontSize:'14px', color:'#94a3b8'}}>Cliente:</label>
            <input value={cliente} onChange={e=>setCliente(e.target.value)} 
              placeholder="Anonimo"
              style={{width:'100%', padding:'10px', background:'#1e293b', color:'white', border:'1px solid #334155', borderRadius:'4px', fontSize:'16px'}}/>
          </div>
        </div>

        <div style={{display:'flex', gap:'10px', marginBottom:'20px', flexWrap:'wrap'}}>
          <input value={numero} onChange={e=>setNumero(e.target.value)} 
            placeholder="Número" maxLength="2" type="text"
            style={{flex:'1 1 100px', padding:'12px', fontSize:'20px', background:'#1e293b', color:'white', border:'1px solid #334155', borderRadius:'4px', textAlign:'center'}}/>
        <input value={monto} onChange={e=>setMonto(e.target.value)} 
           placeholder="Monto" type="number"
            style={{flex:'1 1 100px', padding:'12px', fontSize:'20px', background:'#1e293b', color:'white', border:'1px solid #334155', borderRadius:'4px', textAlign:'center'}}/>
        <select value={condicion} onChange={(e) => setCondicion(e.target.value)} 
          style={{flex:'1 1 100px', padding:'12px', borderRadius:'8px', background:'#0f172a', color:'white', border:'1px solid #334155'}}>
          <option value="Contado">Contado</option>
          <option value="Crédito">Crédito</option>
        </select>
          <button onClick={ingresarVenta}
            style={{flex:'1 1 150px', padding:'12px', background:'#3b82f6', color:'white', border:'none', fontSize:'16px', cursor:'pointer', borderRadius:'4px', fontWeight:'bold'}}>
            Ingresar Venta
          </button>
        </div>

          <div style={{background:'#1e3a5f', padding:'16px', borderRadius:'8px', margin:'16px 0'}}>
    <div style={{color:'white', fontWeight:'bold', marginBottom:'8px'}}>Tiquete:</div>
    
    {tiquete?.numero ? (
      <>
        <div style={{color:'#94a3b8'}}>Número: <span style={{color:'white'}}>{tiquete.numero}</span></div>
        <div style={{color:'#94a3b8'}}>Monto: <span style={{color:'white'}}>₡{tiquete.monto}</span></div>
        <div style={{color:'#94a3b8'}}>Sorteo: <span style={{color:'white'}}>{tiquete.sorteo}</span></div>
        <div style={{color:'#94a3b8'}}>Condición: <span style={{color:'white'}}>{tiquete.condicion}</span></div>
        
        <div style={{display:'flex', gap:'8px', marginTop:'12px'}}>
          <button 
            onClick={imprimirTiquete} 
            style={{background:'#16a34a', padding:'8px 16px', borderRadius:'6px', color:'white', fontWeight:'bold', width:'100%', border:'none', cursor:'pointer'}}
          >
            Imprimir
          </button>
          
          <button 
            onClick={compartirWhatsApp} 
            style={{background:'#22c55e', padding:'8px 16px', borderRadius:'6px', color:'white', fontWeight:'bold', width:'100%', border:'none', cursor:'pointer'}}
          >
            WhatsApp
          </button>
        </div>
      </>
    ) : (
      <div style={{color:'#64748b'}}>Registre una venta para ver el tiquete</div>
    )}
  </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%', borderCollapse:'collapse', minWidth:'500px'}}>
              <thead>
                <tr style={{borderBottom:'2px solid #334155', textAlign:'left'}}>
                  <th style={{padding:'8px'}}>Hora</th>
                  <th style={{padding:'8px'}}>Número</th>
                  <th style={{padding:'8px'}}>Monto</th>
                  <th style={{padding:'8px'}}>Cliente</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map(v => (
                  <tr key={v.id} style={{borderBottom:'1px solid #334155'}}>
                    <td style={{padding:'8px'}}>{new Date(v.fecha).toLocaleTimeString('es-CR')}</td>
                    <td style={{padding:'8px', fontWeight:'bold'}}>{v.numero}</td>
                    <td style={{padding:'8px'}}>₡{v.monto.toLocaleString()}</td>
                    <td style={{padding:'8px'}}>{v.cliente}</td>
                  </tr>
                ))}
                {ventas.length === 0 && (
                  <tr><td colSpan="4" style={{padding:'20px', textAlign:'center', color:'#64748b'}}>No hay ventas hoy</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{marginTop:'15px', fontSize:'18px', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:'10px'}}>
            <strong>Total Vendido: ₡{totalVendido.toLocaleString()}</strong>
            <strong>Comisión: ₡{comision.toLocaleString()}</strong>
          </div>
        </div>
      <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
        <button onClick={imprimirTiquete} style={{flex:1, padding:'12px', borderRadius:'8px', background:'#16a34a', color:'white', border:'none', fontWeight:'bold'}}>
          🖨️ Imprimir
        </button>
        <button onClick={compartirWhatsApp} style={{flex:1, padding:'12px', borderRadius:'8px', background:'#25d366', color:'white', border:'none', fontWeight:'bold'}}>
          📱 WhatsApp
        </button>
      </div>

        <div style={{display:'flex', gap:'20px', flexWrap:'wrap'}}>
          <div style={{flex:'1 1 300px', background:'#1e293b', padding:'15px', borderRadius:'4px'}}>
            <h4 style={{color:'#22c55e', marginTop:0}}>10 MÁS VENDIDOS</h4>
            {numerosMasVendidos.length === 0 && <div style={{color:'#64748b'}}>Sin datos</div>}
            {numerosMasVendidos.map(([num, total]) => (
              <div key={num} style={{display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #334155'}}>
                <span style={{fontWeight:'bold'}}>{num}</span>
                <span>₡{total.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div style={{flex:'1 1 300px', background:'#1e293b', padding:'15px', borderRadius:'4px'}}>
            <h4 style={{color:'#ef4444', marginTop:0}}>RESTRICCIONES</h4>
            {restricciones.length === 0 && <div style={{color:'#64748b'}}>Sin restricciones</div>}
            {restricciones.map(r => (
              <div key={r.id} style={{display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #334155'}}>
                <span style={{fontWeight:'bold'}}>{r.numero}</span>
                <span>Max: ₡{r.max_monto.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

