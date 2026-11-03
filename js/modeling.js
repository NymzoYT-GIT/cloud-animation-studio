
export function createModelingSystem(THREE, scene) {
  const objects = [];
  let selectedObject = null;

  const material = new THREE.MeshStandardMaterial({
    color: 0xd87932,
    roughness: 0.65
  });

  function addObject(type) {
    let geometry;

    switch (type) {
      case "Cube":
        geometry = new THREE.BoxGeometry(2, 2, 2);
        break;

      case "Sphere":
        geometry = new THREE.SphereGeometry(1, 32, 24);
        break;

      case "Cylinder":
        geometry = new THREE.CylinderGeometry(1, 1, 2, 32);
        break;

      default:
        return;
    }

    const mesh = new THREE.Mesh(
      geometry,
      material.clone()
    );

    mesh.name = type;
    mesh.position.set(
      objects.length * 2,
      1,
      0
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    scene.add(mesh);
    objects.push(mesh);

    selectObject(mesh);
    updateHierarchy();

    return mesh;
  }

  function selectObject(object) {
    if (selectedObject) {
      selectedObject.material.emissive.setHex(0x000000);
    }

    selectedObject = object;

    if (selectedObject) {
      selectedObject.material.emissive.setHex(0x333333);
    }

    updateProperties();
  }

  function updateHierarchy() {
    const sidebar = document.querySelector(".sidebar");
    const oldObjects = sidebar.querySelectorAll(".model-object");

    oldObjects.forEach(item => item.remove());

    objects.forEach(object => {
      const item = document.createElement("div");

      item.className = "object model-object";
      item.textContent = object.name;

      item.addEventListener("click", () => {
        selectObject(object);
      });

      sidebar.insertBefore(
        item,
        sidebar.querySelector("h3:nth-of-type(2)")
      );
    });
  }

  function updateProperties() {
    if (!selectedObject) return;

    const properties = document.querySelector(".properties");

    properties.innerHTML = `
      <h3>Object Properties</h3>
      <p>Selected: ${selectedObject.name}</p>

      <label>Location X</label>
      <input type="number" step="0.1" data-axis="x">

      <label>Location Y</label>
      <input type="number" step="0.1" data-axis="y">

      <label>Location Z</label>
      <input type="number" step="0.1" data-axis="z">

      <label>Rotation X</label>
      <input type="number" step="1" data-rotation="x">

      <label>Rotation Y</label>
      <input type="number" step="1" data-rotation="y">

      <label>Rotation Z</label>
      <input type="number" step="1" data-rotation="z">

      <label>Scale</label>
      <input type="number" step="0.1" min="0.01" data-scale>
    `;

    properties.querySelectorAll("[data-axis]").forEach(input => {
      const axis = input.dataset.axis;
      input.value = selectedObject.position[axis];

      input.addEventListener("change", () => {
        selectedObject.position[axis] = Number(input.value);
      });
    });

    properties.querySelectorAll("[data-rotation]").forEach(input => {
      const axis = input.dataset.rotation;
      input.value = THREE.MathUtils.radToDeg(
        selectedObject.rotation[axis]
      );

      input.addEventListener("change", () => {
        selectedObject.rotation[axis] =
          THREE.MathUtils.degToRad(Number(input.value));
      });
    });

    const scaleInput = properties.querySelector("[data-scale]");
    scaleInput.value = selectedObject.scale.x;

    scaleInput.addEventListener("change", () => {
      const value = Math.max(0.01, Number(scaleInput.value));
      selectedObject.scale.setScalar(value);
    });
  }

  function getSelectedObject() {
    return selectedObject;
  }

  function getObjects() {
    return objects;
  }

  return {
    addObject,
    selectObject,
    getSelectedObject,
    getObjects
  };
}
