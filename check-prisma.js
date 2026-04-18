import prisma from './src/shared/prisma.js';
console.log(Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_')));
process.exit(0);
