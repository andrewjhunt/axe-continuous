# Continuous accessibility with Axe

Axe is an accessibility testing tool from [Deque](https://www.deque.com/axe/devtools/).

Axe provides a JavaScript module that can incorporated into pages (usually during dev/test) with an API for requesting tests returning reports.

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
5. The reports are popped to the user with a Toastie

## Issues / Improvements

* Alternatives to Toast would be good
* The batching process could be improved so that no item waits longer than Xmsec to be scanned
* By the time the user reads the Toast, the issue may be gone from the page (not sure there's anything else to do here)

# Usage

Include the following in the `<head>`.  

```
  <!--
    https://www.npmjs.com/package/axe-core
    Axe accessibility test library
  -->
  <script src="https://cdn.jsdelivr.net/npm/axe-core@4.9.1/axe.min.js"></script>

  <!--
    https://github.com/apvarun/toastify-js
    Toast popups for scan results
  -->
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css">
  <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/toastify-js"></script>

  <!-- script from this repo -->
  <script src="/path/to/script/axe-continuous.js"></script>
```

`axeContinuous` accepts a DOM `Node` that identifies the element at the top of the tree to be scanned. Examples:

```
  // Body element (don't use this with Toast because it creates a loop of change/scan/Toast/change...)
  axeContinuous(document.body)

  // Root element found by id
  const node = document.getElementById("element-id")
  axeContinuous(node)

  // First node with this class name
  const node = document.querySelector(".scan-these-elements")[0]
  axeContinuous(node)
```
