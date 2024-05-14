# Continuous accessibility testing with Axe

Axe is an accessibility testing tool from [Deque](https://www.deque.com/axe/devtools/).

Axe provides a JavaScript module that can incorporated into a web app or web pages to identify accessibility issues during development and testing. This module provides a wrapper around Axe to request testing each time a page change is identified and optimising the coverage for each test.


## Usage

### Libraries

Include the following in the `<head>`.  

```
  <!-- Axe accessibility test library - https://www.npmjs.com/package/axe-core -->
  <script src="https://cdn.jsdelivr.net/npm/axe-core@4.9.1/axe.min.js"></script>

  <!-- Load the Axe continuous library from CDN -->
  <script src="https://cdn.jsdelivr.net/gh/andrewjhunt/axe-continuous@main/axe-continuous.js"></script>

  <!-- OR... load a local copy -->
  <script src="/path/to/script/axe-continuous.js"></script>
```

### Start continuous scanning with Axe

```
axeContinuous(node, queueTimeMsec, axeOptions, handleAxeReport)
```

1. `node`: DOM `Node` object that identifies the element at the top of the tree to be scanned
2. `queueTimeMsec`: how long to queue changes before processing a batch
3. `axeOptions`: Axe's scanning options for `axeRun()`. See the [Axe library documentation](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md#options-parameter)
4. Callback when a scan is completed (see below)

Example:

```
  axeContinuous(
    document.getElementById("element-id")
    250,
    {
      runOnly: {
        type: 'tag',
        values: ['wcag2aa']
      }
    },
    handleAxeReport
  )
```

The Axe report handler is passed 2 parameters:

```
handleAxeReport(issuesFound, axeReport)`

1. `issuesFound`: boolean which is true if the report includes violations
2. `axeReport`: the Axe report returned from `axe.run()`. See [Axe API documentation](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md#results-object)

## Sample report handler

Here is an example that prints the scan results to the console.

```
  function handleAxeScan(issuesFound, axeReport) {
    if (!issuesFound)
      console.debug("Axe scan result: 0 violations found")
  
    else {
      const numNodes = axeReport.violations.reduce((acc, cur) => acc + cur.nodes.length, 0)
      console.log(numNodes)
  
      console.log(" ")
      console.warn(`Axe scan result: ${axeReport.violations.length} violations affecting ${numNodes} nodes`)
  
      axeReport.violations.forEach(v => {
        console.warn(`--- Accessibility issue: "${v.help}" - ${v.impact} - ${v.helpUrl}`)
        v.nodes.forEach((node, idx) => {
          console.warn(idx, `Axe ${v.impact}`, node)
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

## Issues / Improvements

* Add an example document with a collection of accessibility errors and some dynamic content
* The batching process could be improved so that no item waits longer than Xmsec to be scanned
* By the time the user reads the results, the issue may be gone from the page (not sure there's anything else to do here)
