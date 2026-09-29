const amazon = document.getElementById("amazon");
const rightbox = document.getElementById("indright");

if (amazon && rightbox) {
  amazon.addEventListener("click", () => {
    rightbox.innerHTML = `
      <div class="company-detail">
        <h1>Amazon</h1>
        <p>Explore open opportunities and roles available through CareerBridge.</p>
        <a href="student.html"><button>View Jobs</button></a>
      </div>`;
  });
}
