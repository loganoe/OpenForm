document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    const output = document.getElementById('output');

    // Initialize AR.Detector
    const detector = new AR.Detector();

    // Set up the webcam
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(function(stream) {
            video.srcObject = stream;
            video.play();
            requestAnimationFrame(tick);
        })
        .catch(function(err) {
            console.error("Error accessing the webcam: ", err);
        });

    function tick() {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const markers = detector.detect(imageData);

            if (markers.length > 0) {
                output.innerHTML = `Detected ${markers.length} marker(s):<br>`;
                markers.forEach(marker => {
                    const corners = marker.corners;
                    const center = { x: 0, y: 0 };
                    corners.forEach(corner => {
                        center.x += corner.x;
                        center.y += corner.y;
                    });
                    center.x /= corners.length;
                    center.y /= corners.length;

                    const rotation = Math.atan2(corners[1].y - corners[0].y, corners[1].x - corners[0].x);

                    output.innerHTML += `Marker ID: ${marker.id}<br>`;
                    output.innerHTML += `Position: (${center.x.toFixed(2)}, ${center.y.toFixed(2)})<br>`;
                    output.innerHTML += `Rotation: ${(rotation * 180 / Math.PI).toFixed(2)} degrees<br>`;
                    output.innerHTML += '<br>';
                });
            } else {
                output.innerHTML = 'No markers detected.';
            }
        }
        requestAnimationFrame(tick);
    }
});
