import { createClient } from '@supabase/supabase-js'
import Config from 'react-native-config'

const supabaseUrl = Config.SUPABASE_URL
const supabaseKey = Config.SUPABASE_ANON_KEY
console.log("SUPABASE_URL", Config.SUPABASE_URL)
console.log("SUPABASE_ANON_KEY", Config.SUPABASE_ANON_KEY?.slice(0, 10))

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan variables de entorno de Supabase')
}

export const supabase = createClient(supabaseUrl, supabaseKey)