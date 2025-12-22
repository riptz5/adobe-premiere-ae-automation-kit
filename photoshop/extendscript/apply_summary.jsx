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
    var jsonFile = File.openDialog("Elige result JSON", "*.json");
    if (!jsonFile) throw new Error("Cancelado.");
    var payload = JSON.parse(readFile(jsonFile.fsName));
    if (!payload || (!payload.summary && !payload.highlights)) throw new Error("JSON sin summary/highlights.");

    var doc = ensureDoc();
    var summary = payload.summary || "No summary.";
    var highlights = payload.highlights || [];
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
