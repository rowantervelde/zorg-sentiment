#!/usr/bin/env node
import { fileURLToPath, URL } from 'node:url'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { JSDOM } from 'jsdom'
import axe from 'axe-core'

async function loadPageComponent() {
	const vite = await createServer({
		logLevel: 'error',
		plugins: [vue()],
		resolve: {
			alias: {
				'@': fileURLToPath(new URL('../../src', import.meta.url)),
				'~': fileURLToPath(new URL('../../src', import.meta.url)),
			},
		},
		server: { middlewareMode: true },
		appType: 'custom',
	})

	try {
		const mod = await vite.ssrLoadModule('/src/pages/index.vue')
		return { component: mod.default, close: () => vite.close() }
	} catch (error) {
		await vite.close()
		throw error
	}
}

async function runAudit() {
	const { component, close } = await loadPageComponent()

	const app = createSSRApp(component)
	const html = await renderToString(app)
	const dom = new JSDOM(`<!DOCTYPE html><html lang="en"><body>${html}</body></html>`, {
		pretendToBeVisual: true,
		url: 'http://localhost/',
	})

	const transferableGlobals = ['Node', 'NodeList', 'HTMLElement', 'Element', 'Document', 'DocumentFragment', 'SVGElement']
	for (const name of transferableGlobals) {
		if (!globalThis[name]) {
			globalThis[name] = dom.window[name]
		}
	}
	globalThis.window = dom.window

	const results = await axe.run(dom.window.document.body, {
		runOnly: {
			type: 'tag',
			values: ['wcag2a', 'wcag2aa'],
		},
	})

	if (results.violations.length > 0) {
		console.error('Accessibility violations detected:')
		for (const violation of results.violations) {
			console.error(`- ${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`)
		}
			await close()
			process.exit(1)
	}

	console.log('Accessibility audit passed (WCAG 2.0 A/AA).')
		await close()
}

runAudit().catch((error) => {
	console.error('Accessibility audit failed to run:', error)
	process.exit(1)
})
