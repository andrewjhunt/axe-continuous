// axe-continuous is a simple wrapper around the Axe API that scans for Accessibility issues during dynamic usage
// See the README for usage instructions
//
// Copyright Andrew Hunt 2024
// License MIT 2.0


const options = {}
let axeDebug = false
let commonAncestor = null
let lastTimeoutId = null



axeContinuous = {

	runAxe(node) {
		if (axeDebug) console.debug("running the Axe scan", node)

		setTimeout(() => {
			axe.run(node, options.axeOptions, (err, results) => {
				if (err) {
					console.error(err)
					throw err
				}

				options.scanCompleteCallback(results.violations.length > 0, results)
			})
		})
	},


	findCommonAncestor(nodes) {
		if (nodes.length < 2) return nodes[0] || null;

		let paths = nodes.map(node => {
			let path = [];
			while (node) {
				path.unshift(node);
				node = node.parentNode;
			}

			// exclude elements that aren't under document
			// e.g. createElement that hasn't been added to the page
			return path[0] === document ? path : null
		}).filter(path => path)

		let result = paths[0];
		for (let i = 1; i < paths.length; i++) {
			result = result.filter((node, index) => paths[i][index] === node);
		}

		return result.pop();
	},


	delayRun(newCommonAncestor) {
		if (lastTimeoutId)
			clearTimeout(lastTimeoutId)

		if (commonAncestor && axeDebug) console.debug(`finding common ancestor with the queued items`)

		commonAncestor = commonAncestor
			? axeContinuous.findCommonAncestor([newCommonAncestor], [commonAncestor])
			: newCommonAncestor

		lastTimeoutId = setTimeout(() => {
			lastTimeoutId = null
			const _commonAncestor = commonAncestor
			commonAncestor = null

			axeContinuous.runAxe(_commonAncestor)
		}, options.axeDelayMsec)
	},


	start(root, axeDelayMsec, axeOptions, scanCompleteCallback, debug=false) {
		if (!root) throw new Error(`node is not valid Node or NodeList`)

		axeDebug = debug
		options.axeDelayMsec = axeDelayMsec
		options.axeOptions = axeOptions
		options.scanCompleteCallback = scanCompleteCallback

		// Setup the MutationObserver
		const observer = new MutationObserver(mutations => {
			let affectedNodes = [];

			mutations.forEach(mutation => {
				if (mutation.type === 'childList') {
					affectedNodes.push(...mutation.addedNodes);
					affectedNodes.push(...mutation.removedNodes);
				} else if (mutation.type === 'attributes') {
					affectedNodes.push(mutation.target);
				}
			});

			if (axeDebug) console.debug(`${affectedNodes.length} nodes changed`)

			const commonAncestor = axeContinuous.findCommonAncestor(affectedNodes);

			axeContinuous.delayRun(commonAncestor)
		});


		if (root instanceof Node) root = [root]

		root.forEach(node => {
			if (axeDebug) console.debug("attaching", node)
			// Start observing the document body for changes
			observer.observe(node, {
				childList: true,
				subtree: true,
				attributes: true
			});

			axeContinuous.delayRun(node)
		})
	},


	reportConsoleLog(issuesFound, axeReport) {
		const style = {
			src: {
				base: [
					"color: #fff",
					"background-color: #444",
					"padding: 2px 4px",
					"border-radius: 2px"
				],
				critical: [
					"color: #fff",
					"font-wight: bold",
					"background-color: rgb(227,63,35)"
				],
				serious: [
					"color: #fff",
					"font-wight: bold",
					"background-color: rgb(231,114,43)"
				],
				moderate: [
					"color: #000",
					"background-color: rgb(224,179,63)"
				],
				minor: [
					"color: #000",
					"background-color: rgb(164,204,58)"
				],
				success: [
					"background-color: rgb(62,118,37)"
				]
			}
		}

		Object.keys(style.src).forEach(key => {
			style[key] = style.src.base.join(';') + ';';
			style[key] += style.src[key].join(';');
		})
		
		console.log(" ")

		if (!issuesFound)
			console.log(`%cOK`, style['success'], "axe scan: 0 violations found")

		else {
			const numNodes = axeReport.violations.reduce((acc, cur) => acc + cur.nodes.length, 0)

			console.log(`%cAxe scan result: ${axeReport.violations.length} violations affecting ${numNodes} nodes`, style['base'])

			axeReport.violations.forEach((v, idx) => {

				console.log("")
				console.log(`%c${v.impact}`, style[v.impact], `'${v.id}': ${v.help}`)
				console.log(`   Desc: ${v.description}`)
				console.log(`   Info: ${v.helpUrl}`)
				console.log(`   ${v.nodes.length} nodes affected:`)
				v.nodes.forEach((node, idx) => {
					console.log(`     #${idx}`, document.querySelector(node.target[0]))
				})
				console.log(v)

			})
		}
	}
}
