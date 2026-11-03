
export function createMeshEditor({
  THREE,
  scene,
  camera,
  renderer,
  getSelectedObject
}) {
  let editMode = false;
  let selectionMode = "VERTEX";
  let selectedIndex = -1;

  let activeObject = null;
  let vertexPoints = null;
  let edgeLines = null;
  let selectionOverlay = null;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const sidebar = document.querySelector(".sidebar");

  // Create editor controls
  const panel = document.createElement("div");
  panel.innerHTML = `
    <h3>Mesh Editing</h3>

    <button id="edit-toggle">Enter Edit Mode</button>

    <div id="mesh-tools" style="display:none">
      <button data-mode="VERTEX">Vertex</button>
      <button data-mode="EDGE">Edge</button>
      <button data-mode="FACE">Face</button>

      <p id="mesh-selection">Nothing selected</p>

      <h3>Selection Position</h3>

      <label>X</label>
      <input id="mesh-x" type="number" step="0.1">

      <label>Y</label>
      <input id="mesh-y" type="number" step="0.1">

      <label>Z</label>
      <input id="mesh-z" type="number" step="0.1">

      <button id="mesh-move">Apply Position</button>
    </div>
  `;

  sidebar.appendChild(panel);

  const tools = panel.querySelector("#mesh-tools");

  function removeOverlays() {
    if (!activeObject) return;

    for (const overlay of [
      vertexPoints,
      edgeLines,
      selectionOverlay
    ]) {
      if (overlay) {
        activeObject.remove(overlay);
        overlay.geometry.dispose();

        if (overlay.material) {
          overlay.material.dispose();
        }
      }
    }

    vertexPoints = null;
    edgeLines = null;
    selectionOverlay = null;
  }

  function buildOverlays() {
    if (!activeObject) return;

    removeOverlays();

    const geometry = activeObject.geometry;
    const positions = geometry.getAttribute("position");

    if (!positions) return;

    // Vertex visualization
    const vertexGeometry = new THREE.BufferGeometry();
    vertexGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        Array.from(positions.array),
        3
      )
    );

    vertexPoints = new THREE.Points(
      vertexGeometry,
      new THREE.PointsMaterial({
        color: 0x44ddff,
        size: 9,
        sizeAttenuation: false
      })
    );

    activeObject.add(vertexPoints);

    // Edge visualization
    const edges = new Set();
    const edgePositions = [];

    const index = geometry.index;

    const getIndex = i => index ? index.getX(i) : i;

    const addEdge = (a, b) => {
      const low = Math.min(a, b);
      const high = Math.max(a, b);
      const key = `${low}:${high}`;

      if (edges.has(key)) return;
      edges.add(key);

      edgePositions.push(
        positions.getX(a),
        positions.getY(a),
        positions.getZ(a),

        positions.getX(b),
        positions.getY(b),
        positions.getZ(b)
      );
    };

    for (let i = 0; i < (index ? index.count : positions.count); i += 3) {
      const a = getIndex(i);
      const b = getIndex(i + 1);
      const c = getIndex(i + 2);

      addEdge(a, b);
      addEdge(b, c);
      addEdge(c, a);
    }

    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(edgePositions, 3)
    );

    edgeLines = new THREE.LineSegments(
      edgeGeometry,
      new THREE.LineBasicMaterial({
        color: 0x202020,
        depthTest: true
      })
    );

    activeObject.add(edgeLines);
  }

  function setSelection(index) {
    selectedIndex = index;

    const label = panel.querySelector("#mesh-selection");

    if (index < 0) {
      label.textContent = "Nothing selected";
      selectionOverlay = null;
      return;
    }

    label.textContent = `${selectionMode}: ${index}`;

    if (selectionMode === "VERTEX") {
      const position = activeObject.geometry.getAttribute("position");

      panel.querySelector("#mesh-x").value = position.getX(index);
      panel.querySelector("#mesh-y").value = position.getY(index);
      panel.querySelector("#mesh-z").value = position.getZ(index);
    }
  }

  function enterEditMode() {
    const object = getSelectedObject();

    if (!object || !object.isMesh) {
      alert("Select a mesh object first.");
      return;
    }

    if (activeObject !== object) {
      leaveEditMode();
      activeObject = object;
    }

    editMode = true;
    selectedIndex = -1;

    tools.style.display = "block";
    panel.querySelector("#edit-toggle").textContent = "Exit Edit Mode";

    buildOverlays();
    setSelection(-1);
  }

  function leaveEditMode() {
    editMode = false;
    selectedIndex = -1;

    if (activeObject) {
      removeOverlays();
    }

    activeObject = null;

    tools.style.display = "none";
    panel.querySelector("#edit-toggle").textContent = "Enter Edit Mode";
  }

  function chooseMode(mode) {
    selectionMode = mode;
    selectedIndex = -1;

    if (activeObject) {
      buildOverlays();
    }

    setSelection(-1);
  }

  // Find the nearest vertex to the clicked surface point
  function findVertex(hit) {
    const positions = activeObject.geometry.getAttribute("position");

    const localPoint = activeObject.worldToLocal(
      hit.point.clone()
    );

    let nearest = -1;
    let minDistance = Infinity;

    for (let i = 0; i < positions.count; i++) {
      const vertex = new THREE.Vector3(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i)
      );

      const distance = vertex.distanceTo(localPoint);

      if (distance < minDistance) {
        minDistance = distance;
        nearest = i;
      }
    }

    return nearest;
  }

  // Find the closest edge to the clicked surface point
  function findEdge(hit) {
    const geometry = activeObject.geometry;
    const positions = geometry.getAttribute("position");
    const index = geometry.index;

    const getIndex = i => index ? index.getX(i) : i;

    const localPoint = activeObject.worldToLocal(
      hit.point.clone()
    );

    let nearest = -1;
    let minDistance = Infinity;
    let edgeNumber = 0;

    const edges = new Set();

    const count = index ? index.count : positions.count;

    for (let i = 0; i < count; i += 3) {
      const triangle = [
        getIndex(i),
        getIndex(i + 1),
        getIndex(i + 2)
      ];

      for (const [a, b] of [
        [triangle[0], triangle[1]],
        [triangle[1], triangle[2]],
        [triangle[2], triangle[0]]
      ]) {
        const key = `${Math.min(a,b)}:${Math.max(a,b)}`;

        if (edges.has(key)) continue;
        edges.add(key);

        const start = new THREE.Vector3(
          positions.getX(a),
          positions.getY(a),
          positions.getZ(a)
        );

        const end = new THREE.Vector3(
          positions.getX(b),
          positions.getY(b),
          positions.getZ(b)
        );

        const closest = new THREE.Vector3();

        closest.subVectors(end, start);
        const lengthSq = closest.lengthSq();

        const t = lengthSq === 0 ? 0 :
          THREE.MathUtils.clamp(
            new THREE.Vector3().subVectors(localPoint, start)
              .dot(closest) / lengthSq,
            0, 1
          );

        closest.copy(start).addScaledVector(
          new THREE.Vector3().subVectors(end, start), t
        );

        const distance = closest.distanceTo(localPoint);

        if (distance < minDistance) {
          minDistance = distance;
          nearest = edgeNumber;
        }

        edgeNumber++;
      }
    }

    return nearest;
  }

  function showFace(faceIndex) {
    const geometry = activeObject.geometry;
    const positions = geometry.getAttribute("position");
    const index = geometry.index;

    const getIndex = i => index ? index.getX(i) : i;

    const offset = faceIndex * 3;

    const points = [];

    for (let i = 0; i < 3; i++) {
      const vertex = getIndex(offset + i);

      points.push(
        positions.getX(vertex),
        positions.getY(vertex),
        positions.getZ(vertex)
      );
    }

    const faceGeometry = new THREE.BufferGeometry();

    faceGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points, 3)
    );

    selectionOverlay = new THREE.Mesh(
      faceGeometry,
      new THREE.MeshBasicMaterial({
        color: 0x44ddff,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );

    activeObject.add(selectionOverlay);
  }

  function onPointerDown(event) {
    if (!editMode || !activeObject) return;

    const rect = renderer.domElement.getBoundingClientRect();

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const hits = raycaster.intersectObject(activeObject, false);

    if (!hits.length) {
      setSelection(-1);
      return;
    }

    const hit = hits[0];

    if (selectionMode === "VERTEX") {
      setSelection(findVertex(hit));
    }

    if (selectionMode === "EDGE") {
      setSelection(findEdge(hit));
    }

    if (selectionMode === "FACE") {
      if (selectionOverlay) {
        activeObject.remove(selectionOverlay);
        selectionOverlay.geometry.dispose();
        selectionOverlay.material.dispose();
        selectionOverlay = null;
      }

      setSelection(hit.faceIndex);
      showFace(hit.faceIndex);
    }
  }

  function applyVertexPosition() {
    if (
      !editMode ||
      selectionMode !== "VERTEX" ||
      selectedIndex < 0
    ) return;

    const positions = activeObject.geometry.getAttribute("position");

    positions.setXYZ(
      selectedIndex,
      Number(panel.querySelector("#mesh-x").value),
      Number(panel.querySelector("#mesh-y").value),
      Number(panel.querySelector("#mesh-z").value)
    );

    positions.needsUpdate = true;

    activeObject.geometry.computeVertexNormals();
    activeObject.geometry.computeBoundingBox();
    activeObject.geometry.computeBoundingSphere();

    buildOverlays();
    setSelection(selectedIndex);
  }

  panel.querySelector("#edit-toggle").addEventListener("click", () => {
    if (editMode) {
      leaveEditMode();
    } else {
      enterEditMode();
    }
  });

  panel.querySelectorAll("[data-mode]").forEach(button => {
    button.addEventListener("click", () => {
      chooseMode(button.dataset.mode);
    });
  });

  panel.querySelector("#mesh-move").addEventListener(
    "click",
    applyVertexPosition
  );

  renderer.domElement.addEventListener(
    "pointerdown",
    onPointerDown
  );

  return {
    enterEditMode,
    leaveEditMode,
    chooseMode
  };
}
