/* After Effects ExtendScript: apply markers from JSON */
(function () {
  function readFile(path) {
    var f = new File(path);
    if (!f.exists) throw new Error("No existe: " + path);
    f.open("r");
    var s = f.read();
    f.close();
    return s;
  }

  function applyMarkersToComp(comp, markers) {
    var markersProp = comp.markerProperty;
    for (var i = 0; i < markers.length; i++) {
      var m = markers[i];
      var time = m.timeSec || 0;
      var value = new MarkerValue(m.name || "Marker");
      if (m.comment) value.comment = m.comment;
      markersProp.setValueAtTime(time, value);
    }
  }

  app.beginUndoGroup("AutoKit Apply Markers");
  try {
    if (!app.project) throw new Error("No hay proyecto.");
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) throw new Error("Selecciona una comp activa.");

    var jsonFile = File.openDialog("Elige markers JSON", "*.json");
    if (!jsonFile) throw new Error("Cancelado.");
    var payload = JSON.parse(readFile(jsonFile.fsName));
    if (!payload || !payload.markers || !payload.markers.length) throw new Error("JSON sin markers.");

    applyMarkersToComp(comp, payload.markers);
    alert("OK: markers aplicados=" + payload.markers.length);
  } catch (e) {
    alert("ERROR: " + e.toString());
  } finally {
    app.endUndoGroup();
  }
})();
