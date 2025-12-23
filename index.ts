// index.ts
import { config } from 'dotenv'
import { Sandbox } from '@e2b/code-interpreter'

// Load .env.local instead of .env
config({ path: '.env.local' })

const sbx = await Sandbox.create() // By default the sandbox is alive for 5 minutes
const execution = await sbx.runCode('print("hello world")') // Execute Python inside the sandbox
console.log(execution.logs)

const files = await sbx.files.list('/')
console.log(files)
