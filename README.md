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
  <script src="https://www.musios.app/axe-continuous/axe-continuous.js"></script>
```

If you are modifying `axe-continuous` then replace the script link by the following with your path:

```
  <script src="/path/to/script/axe-continuous.js"></script>
```


## Start continuous scanning

`axeContinuous(node, queueTimeMsec, axeOptions, scanCompleteCallback)`

*Param 1* `node`

> Pass the DOM `Node` that identifies the element at the top of the tree to be scanned.

*Param 2* `queueTimeMsec`

> How long to queue changes before processing a batch.

*Param 3* `axeOptions`

> Axe's scanning options. See the [Axe library documentation](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md#options-parameter)

*Param 4* `callback`

> Function to be invoked when each scan report is completed. More detail below.

*Param 5* `debug`

> Set `true` for logging of internal activity of `axe-continuous`.

## Handling scan reports

The Axe scan handler is passed 2 parameters:

`handleAxeScan(issuesFound, axeReport)`

1. `issuesFound`: boolean which is true if the report includes violations
2. `axeReport`: the Axe report returned from `axe.run()`. See [Axe API documentation](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md#results-object)

`axe-continuous` provides a single built-in handler. `axeContinuous.reportConsoleLog` pretty-prints each scan results to the console. 

This can be replaced by screen content, JSON logging, popups, or whatever is easiest for users and reporting.


## axeContinuous Example

```html
<script>
  axeContinuous.start(
    document.querySelector(".axe-scan-here"),  // node (what to scan)
    250,                                       // queueTimeMsec
    {                                          // axeOptions
      runOnly: {
        values: ['wcag2a', 'wcag2aa'],
      },
      reporter: "v2", // enable to get performance statistics
      performanceTimer: false
    },
    axeContinuous.reportConsoleLog,           // callback for scan results
    false                                     // axe continuous debug
  )
</script>
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

* Allow multiple selectors to be passed
* Add a JSON collector which can be downloaded
* The batching process would be better the timer was the maximum wait time in the queue
* By the time the user reads the results, the issue may be gone from the page (not sure there's anything else to do here)
* Perhaps somebody can create a screen grab of elements with issues
