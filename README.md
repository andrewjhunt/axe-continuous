# Continuous accessibility with Axe

Axe is an accessibility testing tool from [Deque](https://www.deque.com/axe/devtools/). The Axe suite includes a JavaScript module that can incorporated into pages (usually during dev/test) with an API for requesting tests returning reports.

The purpose of wrapping the tool is:

1. The scans are run automatically after every change to the page
2. Accessibility scan are grouped to reduce page performance impacts. Short burst with many changes are grouped as a single scan
3. Only the parts of the page tree that have changed are scanned
4. The report is returned by this library so that the user can handle as they wish


# Usage - simple all-in-one package

The "simple" packaging is the easiest way to get going. Add this script to your HTML pages.

`axeContinuousOptions` defines how the `axeContinuous` should operate. At a minimum, replace the selector with one or many CSS selectors to identify what parts of the document should be scanned. An element name, id, or class name are most useful.

`axeOptions` defines how the `axe-core` should be configured. Axe defaults are strong so it's ok to leave this out.

```html
  <script>
    const axeContinuousOptions = {
      selectors: ["body", "#id", ".axe-scan-here"]
    }
    const axeOptions = {
      // any options for axe.run() - see below
    }
  </script>

  <script src="https://www.musios.app/axe-continuous/axe-continuous-simple.js"></script>
```

The simple all-in-one package does the following:

1. Loads the scripts for `axe-continuous` and `axe-core`
2. Starts `axe-continuous` configured to write output to the browser console
3. Performs the first scan

Just open the browser and watch the scans each time content on the page changes.

It does NOT persist onto the next page. If the next page is configured the same way, then the process repeats.


## On-demand scan

Perform a scan any time by running this in the browser console with any 

```JS
// Full document scan
axeContinuous.runAxe(document)

// Other examples
axeContinuous.runAxe("body")
axeContinuous.runAxe("#id")
axeContinuous.runAxe(".class-selector")

// Or pass a Node or NodeList
axeContinuous.runAxe(document.body.firstChild)
```

# Demo page

Steps for continuous scanning:

1. Visit the [axe-continuous demo page](https://www.musios.app/axe-continuous/axe-continuous-demo.html)
2. Open the browser console
3. Use the "reveal" and "reveal all" buttons to add content that may include accessibility issues
4. Watch the reports in the console
5. Hover over any of the "nodes affected" to highlight the screen content
6. Click "restart" to do it all again

Manual scan:

1. At any time click "Scan document" to scan the entire DOM for accessibility issues

# Usage - developer version

The version below provides more control over usage.

## Packages

Include the following in the `<head>`.  

```html
  <script src="https://cdn.jsdelivr.net/npm/axe-core@4.9.1/axe.min.js"></script>
  <script src="https://www.musios.app/axe-continuous/axe-continuous.js"></script>
```

If you are modifying `axe-continuous` then replace the script link by the following with your path:

```html
  <script src="/path/to/script/axe-continuous.js"></script>
```


## Start continuous scanning

`axeContinuous(selectors, queueTimeMsec, axeOptions, scanCompleteCallback)`

*Param 1* `selectors`

> Pass an array containing any number of CSS selectors that identify elements to be scanned. A common usage is to put an ID on the root element to be scanned.

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
  <!-- Axe continuous loading with more developer control -->
  <script>
    function startAxeContinuous() {
      axeContinuous.updateAxeContinuousOptions({
        selectors: [".axe-scan-here"],
        // queueTimeMsec: 250,           
        // scanCompleteCallback: axeContinuous.reportConsoleLog,
        // debug: false,
      })

      // axe-core configuration. axe-core defaults apply.
      axeContinuous.updateAxeOptions({
        // runOnly: {
        //   values: ['wcag2a', 'wcag2aa', 'section508', 'section508.22.n'],
        // },
        // reporter: "v2",
        // performanceTimer: false
      })

      axeContinuous.start()
    }
  </script>

  <script src="https://cdn.jsdelivr.net/npm/axe-core@4.9.1/axe.min.js"></script>
  <script onload="startAxeContinuous()" src="https://www.musios.app/axe-continuous/axe-continuous.js"></script>
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

* Add a JSON collector which can be downloaded
* Add screenshots with WebRTC getDisplayMedia API
* The batching process would be better if the timer was the maximum wait time in the queue
* By the time the user reads the results, the issue may be gone from the page (not sure there's anything else to do here)
* Capture deeper DOM properties like the source file.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Capture Screen Part</title>
</head>
<body>
    <button onclick="captureScreen()">Capture Screen</button>
    <canvas id="canvas" style="display:none;"></canvas> <!-- Hidden canvas -->
    <img id="screenshot" style="border: 1px solid black;"/>
    <script>
        async function captureScreen() {
            try {
                // Request screen capture
                const mediaStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true
                });

                // Reference to video element (not added to the DOM to keep it invisible)
                const video = document.createElement('video');
                video.srcObject = mediaStream;
                video.play();

                // Draw the video frame to canvas once it's playing
                video.onloadedmetadata = () => {
                    const canvas = document.getElementById('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    // Stop all video streams
                    video.srcObject.getTracks().forEach(track => track.stop());

                    // Extract a portion of the canvas (e.g., top-left quarter)
                    const img = document.getElementById('screenshot');
                    img.src = canvas.toDataURL(); // Display as an image on the page

                    // Optionally, extract just the top left quarter
                    const topLeftWidth = canvas.width / 2;
                    const topLeftHeight = canvas.height / 2;
                    img.src = ctx.getImageData(0, 0, topLeftWidth, topLeftHeight).data; // Adjust as needed for specific dimensions
                };
            } catch (err) {
                console.error('Error: ' + err);
            }
        }
    </script>
</body>
</html>
```