document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById("approveJobForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const approvalPin = document.getElementById("approvalPin").value.trim();
    const approverPhone = document.getElementById("approverPhone").value.trim();

    if (!approvalPin || !approverPhone) {
      Swal.fire("Incomplete Form", "Please fill in both the PIN and your phone number.", "warning");
      return;
    }
    
    Swal.fire({ title: 'Verifying...', text: 'Finding job and verifying your identity...', didOpen: () => Swal.showLoading() });

    try {
      const jobsRef = db.collection("extra_jobs");
      const querySnap = await jobsRef
        .where("approvalPin", "==", approvalPin)
        .where("status", "==", "pending_approval")
        .limit(1)
        .get();

      if (querySnap.empty) {
        Swal.fire("Not Found", "Invalid PIN, or the job has already been approved or canceled.", "error");
        return;
      }

      const jobDoc = querySnap.docs[0];
      const jobData = jobDoc.data();

      if (jobData.approverPhone !== approverPhone) {
        Swal.fire("Access Denied", "Your phone number does not match the designated approver for this job.", "error");
        return;
      }
      
      const approverNameSnap = await db.collection("staffs").where("phone", "==", approverPhone).limit(1).get();
      const approverName = approverNameSnap.empty ? approverPhone : approverNameSnap.docs[0].data().name;

      const confirmResult = await Swal.fire({
          title: "Confirm Approval",
          html: `Please confirm you are approving the following job:<br><br><b>Details:</b> ${jobData.jobDetails}<br><b>Initiated by:</b> ${jobData.initiatorName} (${jobData.initiatorPhone})`,
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Yes, Approve It",
          cancelButtonText: "Cancel"
      });
      
      if (!confirmResult.isConfirmed) return;

      await jobDoc.ref.update({
        status: "approved",
        approvedBy: approverName, // Store approver's name for record
        approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
        approvalPin: null // Nullify PIN after use for security
      });

      Swal.fire("Success!", "The extra job has been approved.", "success");
      form.reset();

    } catch (err) {
      console.error("Job approval error:", err);
      Swal.fire("Error", "An unexpected error occurred during approval.", "error");
    }
  });
});