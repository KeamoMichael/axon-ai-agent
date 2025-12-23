import { config } from 'dotenv'
import { Sandbox } from '@e2b/code-interpreter'

// Load .env.local
config({ path: '.env.local' })

console.log('E2B_API_KEY present:', !!process.env.E2B_API_KEY)

const sbx = await Sandbox.create()
console.log('Sandbox created!')

const execution = await sbx.runCode('print("hello world")')
console.log('Execution logs:', execution.logs)

const files = await sbx.files.list('/')
console.log('Files:', files)

await sbx.kill()
console.log('Sandbox closed!')
