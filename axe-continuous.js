// axe-continuous is a simple wrapper around the Axe API that scans for Accessibility issues during dynamic usage
// See the README for usage instructions
//
// Copyright Andrew Hunt 2024
// License MIT 2.0

let axeDelayMsec = 250

const axeOptions = {
	runOnly: {
		type: 'tag',
		values: ['wcag2a']
	}
}

function runAxe(node) {
	// console.log("runAxe", node)

	setTimeout(() => {
		axe.run(node, axeOptions, (err, results) => {
			if (err) throw err

			if (!results.violations.length) {
				if (false) {
					Toastify({
						text: "OK",
						style: { background: "green" },
						duration: 3000
					}).showToast()
				}
				return;
			}

			results.violations.forEach(v => {
				const colorMap = {
					"critical": "red",
					"serious": "orange",
					"moderate": "yellow",
					"minor": "yellow"
				}

				console.warn(`--- Accessibility issue: "${v.help}" - ${v.impact} - ${v.helpUrl}`)
				console.warn(v)
				// console.warn("doc", v.helpUrl)

				v.nodes.forEach((node, idx) => {
					// console.log(node.target)
					document.querySelectorAll(node.target).forEach(node => {
						// node.style.border = `solid 1px ${colorMap[v.impact]}`
						console.warn(idx, `Axe ${v.impact}`, node)
					})
				})

				Toastify({
					text: v.impact + ": " + v.help,
					style: { background: colorMap[v.impact] },
					duration: -1,
					close: true
				}).showToast()

			})
		})
	})
}


function findCommonAncestor(nodes) {
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
}


let commonAncestor = null
let lastTimeoutId = null

function delayRun(newCommonAncestor) {
	if (lastTimeoutId)
		clearTimeout(lastTimeoutId)

	commonAncestor = commonAncestor
		? findCommonAncestor([newCommonAncestor], [commonAncestor])
		: newCommonAncestor

	lastTimeoutId = setTimeout(() => {
		lastTimeoutId = null
		const _commonAncestor = commonAncestor
		commonAncestor = null

		runAxe(_commonAncestor)
	}, axeDelayMsec)
}


function axeContinuous(root, delay = axeDelayMsec) {
	axeDelayMsec = delay

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

		const commonAncestor = findCommonAncestor(affectedNodes);

		delayRun(commonAncestor)
	});


	if (root instanceof Node) root = [root]

	root.forEach(node => {
		// Start observing the document body for changes
		observer.observe(node, {
			childList: true,
			subtree: true,
			attributes: true
		});
	})
}
