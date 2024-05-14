# Continuous accessibility with Axe

Axe is an accessibility testing tool from [Deque](https://www.deque.com/axe/devtools/). The Axe suite includes a JavaScript module that can incorporated into pages (usually during dev/test) with an API for requesting tests returning reports.

The purpose of wrapping the tool is:

1. The scans are run automatically after every change to the page
2. Accessibility scan are grouped to reduce page performance impacts. Short burst with many changes are grouped as a single scan
3. Only the parts of the page tree that have changed are scanned
4. The report is returned by this library so that the user can handle as they wish


# Usage


## Packages
Include the following in the `<head>`.  

```
  <script src="https://cdn.jsdelivr.net/npm/axe-core@4.9.1/axe.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/andrewjhunt/axe-continuous@main/axe-continuous.js"></script>
```

If you are modifying `axe-continuous` then replace the script link by the following with your path:

```
  <script src="/path/to/script/axe-continuous.js"></script>
```


## Start continuous scanning

`axeContinuous(node, queueTimeMsec, axeOptions, scanCompleteCallback)`

1. `node`: DOM `Node` that identifies the element at the top of the tree to be scanned
2. `queueTimeMsec`: how queue change before processing a batch
3. `axeOptions`: Axe's scanning options for `axeRun()`. See the [Axe library documentation](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md#options-parameter)
4. Callback when a scan is completed

Example:

```
  axeContinuous(
    document.querySelector(".axe-scan-here"),
    250,
    {
      runOnly: {
        values: ['wcag2a', 'wcag2aa'],
      },
      reporter: "v2",

      // enable to get performance statistics
      performanceTimer: false
    },
    handleAxeScan
  )
```

The Axe scan handler is passed 2 parameters:

`handleAxeScan(issuesFound, axeReport)`

1. `issuesFound`: boolean which is true if the report includes violations
2. `axeReport`: the Axe report returned from `axe.run()`. See [Axe API documentation](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md#results-object)

Here is an example that pretty-prints the scan results to the console. This can be replaced by screen content, JSON logging, popups or whatever is easiest for users.

```
  function handleAxeScan(issuesFound, axeReport) {
    if (!issuesFound)
      console.debug("Axe scan result: 0 violations found")

    else {
      const numNodes = axeReport.violations.reduce((acc, cur) => acc + cur.nodes.length, 0)

      console.log(" ")
      console.warn(`Axe scan result: ${axeReport.violations.length} violations affecting ${numNodes} nodes`)

      axeReport.violations.forEach((v,idx) => {
        console.log(`Violation ${idx+1}: ${v.help}`)
        console.log(`   How to fix: ${v.helpUrl}`)
        console.log(`   Affects ${v.nodes.length} nodes...`)
        v.nodes.forEach((node, idx) => {
          console.log(`   ${idx}`, document.querySelector(node.target[0])) 
        })
      })
    }
  }
```


## Design 

On dynamic web apps, it is important that each page change that is available to the user be tested. This includes temporary changes (e.g. popups, progress bars) amongst any other changes.

It's not good to instrument the code with lots of "test accessibility now" requests because:

1. Important checkpoints might be missed
2. The changes in a dynamic app may overwhelm the CPU with accessibility requests

So, the design principles are:

1. Monitor for page changes
2. Bundle bursts of changes into a single accessibility request
3. Scan only those parts of the page that have changed

## Implementation

1. The [`MutationObserver()`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) API is used to report all changes to the page from the document root and down.
2. These are queued / batched
3. After 250ms (configurable) with no activity, the batch is prepared for an accessibility scan
4. The "common ancestor" element of all changes is identified so that the scan tree is minimised (e.g. if all changes in the batch are to elements, attributes and text within a particalar `<div>`, then only that element's tree should be scanned

## Resources

* Axe accessibility test library: https://www.npmjs.com/package/axe-core
* axe-continuous utility: https://github.com/andrewjhunt/axe-continuous


## Issues / Improvements

* Make it a package
* Make the console printer a built-in utility
* Add a JSON collector which can be downloaded
* The batching process would be better the timer was the maximum wait time in the queue
* By the time the user reads the results, the issue may be gone from the page (not sure there's anything else to do here)
* Perhaps somebody can create a screen grab of elements with issues
