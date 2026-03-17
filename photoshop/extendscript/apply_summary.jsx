/* Photoshop ExtendScript: apply summary/highlights from JSON */
(function () {
  function readFile(path) {
    var f = new File(path);
    if (!f.exists) throw new Error("No existe: " + path);
    f.open("r");
    var s = f.read();
    f.close();
    return s;
  }

  function ensureDoc() {
    if (app.documents.length > 0) return app.activeDocument;
    return app.documents.add(1920, 1080, 72, "AutoKit Summary");
  }

  function addTextLayer(doc, name, text, x, y, size) {
    var layer = doc.artLayers.add();
    layer.kind = LayerKind.TEXT;
    layer.name = name;
    layer.textItem.contents = text;
    layer.textItem.position = [x, y];
    layer.textItem.size = size;
    return layer;
  }

  app.displayDialogs = DialogModes.NO;
  try {
    var jsonFile = File.openDialog("Elige result JSON (server result.json o GET /v1/jobs/:id/result)", "*.json");
    if (!jsonFile) throw new Error("Cancelado.");
    var payload = JSON.parse(readFile(jsonFile.fsName));
    // Accept top-level summary/highlights or job result shape (result.summary, result.highlights)
    var result = payload.result || payload;
    if (!result || (!result.summary && !result.highlights)) throw new Error("JSON sin summary ni highlights (esperado: result.json del server o { result: { summary, highlights } }).");

    var doc = ensureDoc();
    var summary = result.summary || "No summary.";
    var highlights = result.highlights || [];
    var lines = [];
    for (var i = 0; i < highlights.length; i++) {
      lines.push("- " + (highlights[i].label || ("Highlight " + (i + 1))));
    }
    var highlightsText = lines.join("\n");

    addTextLayer(doc, "AutoKit Summary", summary, 80, 120, 32);
    if (highlightsText) {
      addTextLayer(doc, "AutoKit Highlights", highlightsText, 80, 300, 24);
    }
    alert("OK: capas creadas.");
  } catch (e) {
    alert("ERROR: " + e.toString());
  }
})();
