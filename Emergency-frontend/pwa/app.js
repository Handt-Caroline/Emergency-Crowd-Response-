const screen = document.getElementById("screeen");

function showSOS() {
    screen.innerHTML = `
    <h1> Emergency</h1>
    <button class="sos" onclick="showType()">SOS</button>
    `;
}

function showType() {
    screen.innerHTML = `
    <h2>Select Emergency</h2>
    <button onclick="showHospital()">Accident</button>
    <button onclick="showHospital()">Fire</button>
    <button onclick="showHospital()">Medical</button>
    `;
}

function showHospital() {
    screen.innerHTML = `
    <h2>Recommended Hospital</h2>
    <p>Central Hospital (2km away)</p>
    <button onclick="confirm()"> Send Alert </button>
    `;
}

function confirm() {
    screen.innerHTML = `
    <h2> Alert Sent!</h2>
    <p>Hospital has received your request.</p>
    `;
}

showSOS();