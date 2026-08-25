// Genera el set completo de iconos PWA a partir del logo vectorial.
// Uso: node scripts/generate-icons.mjs
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')

// Marca: ciclo PDCA (4 arcos = Plan·Do·Check·Act) con flecha de mejora
// continua y check central, sobre el degradado violeta→índigo del sistema.
// `scale` reduce la marca para respetar la zona segura de iconos maskable.
function markSvg(scale = 1) {
	return `
	<g transform="translate(256 256) scale(${scale}) translate(-256 -256)"
		 fill="none" stroke="#ffffff" stroke-width="46" stroke-linecap="round">
		<path d="M 174.3 130.2 A 150 150 0 0 1 322 111.4"/>
		<path d="M 381.8 174.3 A 150 150 0 0 1 381.8 337.7"/>
		<path d="M 337.7 381.8 A 150 150 0 0 1 174.3 381.8"/>
		<path d="M 130.2 337.7 A 150 150 0 0 1 130.2 174.3"/>
		<path d="M 322 76 L 376 114 L 316 146 Z" fill="#ffffff" stroke="none"
			stroke-linejoin="round"/>
		<path d="M 194 260 L 240 306 L 322 212" stroke-width="50"
			stroke-linejoin="round"/>
	</g>`
}

function iconSvg({ rounded, scale }) {
	const r = rounded ? 115 : 0
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
	<defs>
		<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#8b5cf6"/>
			<stop offset=".55" stop-color="#6366f1"/>
			<stop offset="1" stop-color="#4f46e5"/>
		</linearGradient>
		<radialGradient id="glow" cx=".3" cy=".18" r=".9">
			<stop offset="0" stop-color="#ffffff" stop-opacity=".22"/>
			<stop offset=".5" stop-color="#ffffff" stop-opacity="0"/>
		</radialGradient>
	</defs>
	<rect width="512" height="512" rx="${r}" fill="url(#bg)"/>
	<rect width="512" height="512" rx="${r}" fill="url(#glow)"/>
	${markSvg(scale)}
</svg>`
}

// Iconos del manifest: cuadrados a sangre (Android los enmascara), la marca
// queda dentro del círculo seguro del 80 %.
const square = Buffer.from(iconSvg({ rounded: false, scale: 0.86 }))
// Favicon: esquinas redondeadas propias (en pestaña no hay máscara del SO).
const roundedFav = Buffer.from(iconSvg({ rounded: true, scale: 1 }))

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

await mkdir(path.join(ROOT, 'public/icons'), { recursive: true })
for (const s of sizes) {
	await sharp(square, { density: 300 })
		.resize(s, s)
		.png()
		.toFile(path.join(ROOT, `public/icons/icon-${s}x${s}.png`))
}
await sharp(roundedFav, { density: 300 })
	.resize(256, 256)
	.png()
	.toFile(path.join(ROOT, 'public/icono.png'))
await writeFile(path.join(ROOT, 'public/logo.svg'), Buffer.from(iconSvg({ rounded: true, scale: 1 })))

console.log('Iconos generados: public/icons/*, public/icono.png, public/logo.svg')
