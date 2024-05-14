// Single JavaScript file that sets up axe-continuous with report output to console

function loadScript(url, onloadFunc) {
  console.log(`axe-continuous-simple: loading ${url}`)
  const scriptEl = document.createElement("script")
  document.body.append(scriptEl)

  scriptEl.onerror = (err) => {
    throw new URIError(`The script ${err.target.src} didn't load correctly.`)
  }
  if (onloadFunc) scriptEl.onload = () => {
    console.log(`axe-continuous-simple: load successful ${url}`)
    onloadFunc()
  }

  scriptEl.src = url
}

loadScript(
  "https://cdn.jsdelivr.net/npm/axe-core@4.9.1/axe.min.js", 
  () => {
    loadScript(
      "https://www.musios.app/axe-continuous/axe-continuous.js",
      () => {
        axeContinuous.start()
        console.log("axeContinuous is running")
      }
    )
  }
)
