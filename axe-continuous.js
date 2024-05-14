// axe-continuous is a simple wrapper around the Axe API that scans for Accessibility issues during dynamic usage
// See the README for usage instructions
//
// Copyright Andrew Hunt 2024
// License MIT 2.0

axeContinuous = {
  
  options: {},
  axeOptions: {},

  // managing the queue
  commonAncestor: null,
  lastTimeoutId: null,

  updateAxeContinuousOptions(opts) {
    axeContinuous.options = {...axeContinuous.options, ...opts}

		if (!axeContinuous.options.selectors) throw new Error(`no selectors provided`)
    if (!axeContinuous.options.scanCompleteCallback) throw new Error(`no callback provided`)
  },

  updateAxeOptions(opts) {
    axeContinuous.axeOptions = {...axeContinuous.axeOptions, ...opts}
  },

	runAxe(node) {
		if (axeContinuous.options.axeDebug) console.debug("running the Axe scan", node)

		setTimeout(() => {
			axe.run(node, axeContinuous.axeOptions, (err, results) => {
				if (err) {
					console.error(err)
					throw err
				}

				axeContinuous.options.scanCompleteCallback(results.violations.length > 0, results)
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
		if (axeContinuous.lastTimeoutId)
			clearTimeout(axeContinuous.lastTimeoutId)

		if (axeContinuous.commonAncestor && axeContinuous.options.axeDebug) 
      console.debug(`finding common ancestor with the queued items`)

		axeContinuous.commonAncestor = axeContinuous.commonAncestor
			? axeContinuous.findCommonAncestor([newCommonAncestor], [axeContinuous.commonAncestor])
			: newCommonAncestor

    axeContinuous.lastTimeoutId = setTimeout(() => {
			axeContinuous.lastTimeoutId = null
			const _commonAncestor = axeContinuous.commonAncestor
			axeContinuous.commonAncestor = null

			axeContinuous.runAxe(_commonAncestor)
		}, axeContinuous.options.axeDelayMsec)
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
	},


	// start(root, axeDelayMsec, axeOptions, scanCompleteCallback, debug=false) {
	start() {
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

			if (axeContinuous.options.axeDebug) console.debug(`${affectedNodes.length} nodes changed`)

			const commonAncestor = axeContinuous.findCommonAncestor(affectedNodes);

			axeContinuous.delayRun(commonAncestor)
		});

    // Start observing the document body for changes
    console.log("axeContinuous.options.selectors", axeContinuous.options.selectors)

		axeContinuous.options.selectors.forEach(selector => {
			if (axeContinuous.options.axeDebug) console.debug("attaching", selector)
      
      const nodes = document.querySelectorAll(selector)
      console.log(selector, nodes)
      
      if (nodes) {
        nodes.forEach(node => {
          observer.observe(node, {
            childList: true,
            subtree: true,
            attributes: true
          })

          // Kick off the first scan
  			  axeContinuous.delayRun(node)
        })
      }
		})
	}
}


// Load options based on (a) defaults and (b) opts provided by loader
axeContinuous.updateAxeContinuousOptions({
  ...{
    selectors: [],
    queueTimeMsec: 250,
    scanCompleteCallback: axeContinuous.reportConsoleLog,
    debug: false
  },
  ...axeContinuousOptions
})

// Load axe-core options provided by loader (if any)
// Axe provides strong default options
axeContinuous.updateAxeOptions( axeOptions )


console.log("axeContinuous.options", axeContinuous.options)
