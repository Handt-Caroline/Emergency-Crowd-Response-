const alerts = [
    { id: 1, type: "Accident", location: "Yaounde", victims: 2},
    { id: 2, type: "Fire", location: "Bastos", victims: 5}
];

const container = document.getElementById("alerts");

alerts.forEach(alert => {
    const div = document.createElement("div");
    div.className = "alert-card";

    div.innerHTML = `
    <p><b>Type:</b> ${alert.type}</p>
    <p><b>Location:</b> ${alert.location}</p>
    <p><b>Victims:</b> ${alert.victims}</p>
    <button class="accept" onclick="handleAction(${alert.id},'accepted')"> Accept</button>
    <button class="decline" onclick="handleAction(${alert.id},'declined')">Decline</button>
    `;

    container.appendChild(div);
});

function handleAction(id, action) {
    alert("Alert " + id + " " + action);
}