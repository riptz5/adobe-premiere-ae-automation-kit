/* After Effects ExtendScript */
(function () {
  function readFile(path) {
    var f = new File(path);
    if (!f.exists) throw new Error("No existe: " + path);
    f.open("r");
    var s = f.read();
    f.close();
    return s;
  }

  function parseCSV(csv) {
    // Minimal CSV parser (no quoted commas)
    var lines = csv.replace(/\r/g,"").split("\n").filter(function(l){ return l.trim().length; });
    if (lines.length < 2) throw new Error("CSV vacío.");
    var headers = lines[0].split(",").map(function(h){ return h.trim(); });
    var rows = [];
    for (var i=1; i<lines.length; i++) {
      var cols = lines[i].split(",").map(function(c){ return c.trim(); });
      var row = {};
      for (var j=0; j<headers.length; j++) row[headers[j]] = cols[j] || "";
      rows.push(row);
    }
    return rows;
  }

  function setText(layer, value) {
    var prop = layer.property("Source Text");
    if (!prop) return false;
    var doc = prop.value;
    doc.text = value;
    prop.setValue(doc);
    return true;
  }

  function replaceFootage(placeholderName, assetPath) {
    if (!assetPath) return false;
    var f = new File(assetPath);
    if (!f.exists) return false;
    var footage = app.project.importFile(new ImportOptions(f));
    for (var i=1; i<=app.project.numItems; i++) {
      var item = app.project.item(i);
      if (item && item instanceof FootageItem && item.name === placeholderName) {
        item.replace(footage.file);
        return true;
      }
    }
    return false;
  }

  function findCompByName(name) {
    for (var i=1; i<=app.project.numItems; i++) {
      var it = app.project.item(i);
      if (it && it instanceof CompItem && it.name === name) return it;
    }
    return null;
  }

  app.beginUndoGroup("AutoKit Generate From CSV");

  try {
    var csvFile = File.openDialog("Elige CSV", "*.csv");
    if (!csvFile) throw new Error("Cancelado.");
    var csv = readFile(csvFile.fsName);
    var rows = parseCSV(csv);

    for (var r=0; r<rows.length; r++) {
      var row = rows[r];
      var templateName = row.profile ? ("TEMPLATE_" + row.profile) : "TEMPLATE";
      var template = findCompByName(templateName) || findCompByName("TEMPLATE");
      if (!template) throw new Error("No encontré comp TEMPLATE.");

      var newComp = template.duplicate();
      newComp.name = row.compName || ("Render_" + (r+1));

      // Set text layers by name: TITLE, SUBTITLE
      for (var l=1; l<=newComp.numLayers; l++) {
        var layer = newComp.layer(l);
        if (layer.name === "TITLE" && row.title) setText(layer, row.title);
        if (layer.name === "SUBTITLE" && row.subtitle) setText(layer, row.subtitle);
      }

      // Replace footage placeholder (optional)
      // You can name your placeholder footage item as PLACEHOLDER_ASSET
      if (row.assetPath) replaceFootage("PLACEHOLDER_ASSET", row.assetPath);

      // Add to Render Queue
      var rqItem = app.project.renderQueue.items.add(newComp);
      rqItem.outputModule(1).file = new File(Folder.myDocuments.fsName + "/" + newComp.name + ".mp4");
    }

    alert("Listo: comps duplicadas=" + rows.length + " (revisa Render Queue).");
  } catch (e) {
    alert("ERROR: " + e.toString());
  } finally {
    app.endUndoGroup();
  }
})();
