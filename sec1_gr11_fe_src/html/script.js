// CreatorMatch - Basic JavaScript
// Uses functions, DOM selectors, and event listeners.

function searchCreator() {
    let keyword = document.querySelector("#creatorName").value.toLowerCase();
    let category = document.querySelector("#category").value;
    let cards = document.querySelectorAll(".creator-card");

    cards.forEach(function(card) {
        let name = card.getAttribute("data-name").toLowerCase();
        let cardCategory = card.getAttribute("data-category");

        let nameMatch = name.includes(keyword);
        let categoryMatch = category === "All" || category === cardCategory;

        if (nameMatch && categoryMatch) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}

function login() {
    let username = document.querySelector("#username").value;
    let password = document.querySelector("#password").value;
    let message = document.querySelector("#loginMessage");

    if (username === "admin" && password === "admin123") {
        window.location.href = "admin.html";
        return false;
    } else {
        message.innerHTML = "Username or password is incorrect.";
        return false;
    }
}

function deleteCreator(button) {
    let answer = confirm("Do you want to delete this creator?");

    if (answer === true) {
        let row = button.parentElement.parentElement;
        row.remove();
    }
}
