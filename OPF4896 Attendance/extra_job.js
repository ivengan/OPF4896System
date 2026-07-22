document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById("extraJobForm");
    const btnPullCages = document.getElementById("btnPullCages");
    const btnFollowLorry = document.getElementById("btnFollowLorry");
    const btnDisinfect = document.getElementById("btnDisinfect");
    const btnOthers = document.getElementById("btnOthers");
    const jobButtons = document.querySelectorAll(".job-btn");

    let selectedJobDetail = "";

    function updateSelectedButton(selectedBtn) {
        jobButtons.forEach(btn => {
            btn.classList.remove("bg-blue-500", "text-white", "border-blue-500");
            btn.classList.add("text-gray-700", "border-gray-300");
        });
        selectedBtn.classList.add("bg-blue-500", "text-white", "border-blue-500");
        selectedBtn.classList.remove("text-gray-700", "border-gray-300");
    }

    btnPullCages.addEventListener('click', () => {
        selectedJobDetail = "Pull cages";
        updateSelectedButton(btnPullCages);
    });

    btnFollowLorry.addEventListener('click', () => {
        selectedJobDetail = "Follow lorry";
        updateSelectedButton(btnFollowLorry);
    });

    btnDisinfect.addEventListener('click', () => {
        selectedJobDetail = "Disinfect the factory";
        updateSelectedButton(btnDisinfect);
    });

    btnOthers.addEventListener('click', async () => {
        const { value: text } = await Swal.fire({
            input: 'textarea',
            inputLabel: 'Other Job Details',
            inputPlaceholder: 'Type your job details here...',
            showCancelButton: true,
            confirmButtonText: "Set Details"
        });

        if (text) {
            selectedJobDetail = text.trim();
            const otherText = i18next.isInitialized ? i18next.t('jobOther') : "Other jobs";
            btnOthers.querySelector('.btn-text').textContent = `${otherText}: ${selectedJobDetail.substring(0, 10)}...`;
            updateSelectedButton(btnOthers);
        }
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const initiatorPhone = document.getElementById("initiatorPhone").value.trim();
        const approverPhone = document.getElementById("approverPhone").value.trim();

        // --- Basic Validation ---
        if (!selectedJobDetail) {
            Swal.fire("Incomplete Form", "Please select a job type first.", "warning");
            return;
        }
        if (!initiatorPhone || !approverPhone) {
            Swal.fire("Incomplete Form", "Please fill in both initiator and approver phone numbers.", "warning");
            return;
        }
        if (initiatorPhone === approverPhone) {
            Swal.fire("Invalid Input", "Initiator and approver cannot be the same person.", "error");
            return;
        }

        Swal.fire({ title: 'Checking Eligibility...', text: 'Please wait...', didOpen: () => Swal.showLoading() });

        try {
            // --- Attendance Qualification Check ---
            const today = new Date();
            const lastDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            const firstDayOfPrevMonth = new Date(lastDayOfPrevMonth.getFullYear(), lastDayOfPrevMonth.getMonth(), 1);

            const formatDate = (d) => d.toISOString().split('T')[0];
            const firstDayStr = formatDate(firstDayOfPrevMonth);
            const lastDayStr = formatDate(lastDayOfPrevMonth);

            const attendanceQuery = await db.collection("attendance")
                .where("phone", "==", initiatorPhone)
                .where("date", ">=", firstDayStr)
                .where("date", "<=", lastDayStr)
                .get();
          
            const attendanceCount = attendanceQuery.size;
            const requiredDays = 23; // 90% of 26 days, rounded

            if (attendanceCount < requiredDays) {
                Swal.fire({
                    icon: 'error',
                    title: 'Not Eligible',
                    text: 'You did not reach 90% of attendance rate last month, hence you are not eligible for the job!',
                });
                return;
            }
          
            Swal.update({ title: 'Processing...', text: 'Please wait...' });
            
            const initiatorName = initiatorPhone; 
            const approvalPin = Math.floor(100000 + Math.random() * 900000).toString();
            const jobPayload = {
                jobDetails: selectedJobDetail,
                initiatorPhone,
                initiatorName,
                approverPhone,
                approvalPin,
                status: "pending_approval",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await db.collection("extra_jobs").add(jobPayload);

            const approveUrl = `https://staff-attendance-ofm996.web.app/approve_job.html`;
            const message = `Hi, ${initiatorName} has requested you to approve an extra job.\n\nDetails: ${selectedJobDetail}\n\nApproval PIN: ${approvalPin}\n\nPlease approve here: ${approveUrl}`;
            
            let formattedApproverPhone = approverPhone;
            if (formattedApproverPhone.startsWith('0')) {
                formattedApproverPhone = '6' + formattedApproverPhone;
            }

            const whatsappUrl = `https://wa.me/${formattedApproverPhone}?text=${encodeURIComponent(message)}`;
            
            await Swal.fire({
                title: "Ready to Send!",
                text: "Your job request has been created. You will now be redirected to WhatsApp.",
                icon: "success",
                confirmButtonText: "Open WhatsApp"
            });
            window.location.href = whatsappUrl;

        } catch (err) {
            console.error("Extra job creation error:", err);
            Swal.fire("Error", "Could not create the job request. The database might have rejected the request. Details: " + err.message, "error");
        }
    });
});