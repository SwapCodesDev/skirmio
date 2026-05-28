export class CanvasCharacterRenderer {
    static drawCharacter(ctx, data) {

        const drawRoundedRect = (x, y, w, h, r, color) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
            else ctx.rect(x, y, w, h);
            ctx.fill();
            ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        };


        const drawTaperedLimb = (len, wStart, wEnd, color) => {
            ctx.fillStyle = color;
            ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, wStart / 2, Math.PI / 2, -Math.PI / 2);
            ctx.lineTo(len, -wEnd / 2);
            ctx.arc(len, 0, wEnd / 2, -Math.PI / 2, Math.PI / 2);
            ctx.lineTo(0, wStart / 2);
            ctx.fill();
            ctx.stroke();
        };


        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 31, 24, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();


        const drawLeg = (x) => {
            ctx.save();
            ctx.translate(x, 10);

            drawRoundedRect(-5, 0, 10, 18, 4, data.pants.color);

            ctx.fillStyle = data.boots.color;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(-6, 16, 12, 5, 2);
            else ctx.rect(-6, 16, 12, 5);
            ctx.fill();

            ctx.fillStyle = '#111';
            ctx.fillRect(-6, 21, 12, 2);
            ctx.restore();
        };

        drawLeg(-8);
        drawLeg(8);



        drawRoundedRect(-14, -15, 28, 32, 8, data.shirt.color);


        ctx.save();
        const bodyGrad = ctx.createLinearGradient(0, -15, 0, 17);
        bodyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        bodyGrad.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-14, -15, 28, 32, 8);
        ctx.fill();
        ctx.restore();


        if (data.shirt.style === 'tactical') {
            ctx.fillStyle = '#3b5235';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(-10, -12, 20, 20, 6);
            else ctx.rect(-10, -12, 20, 20);
            ctx.fill();

            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(-1, -12, 2, 20);
        } else if (data.shirt.style === 'suit') {

            ctx.fillStyle = '#111'; ctx.fillRect(-1, -15, 2, 32);
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-1, -15); ctx.lineTo(-5, -5); ctx.lineTo(5, -5); ctx.lineTo(1, -15); ctx.fill();
        }


        ctx.fillStyle = '#222'; ctx.fillRect(-14, 10, 28, 5);
        ctx.fillStyle = '#555'; ctx.fillRect(-4, 10, 8, 5);


        const drawArm = (side) => {
            ctx.save();

            ctx.translate(side * 16, -12);

            ctx.rotate(side * 0.15);

            ctx.rotate(Math.PI / 2);


            drawTaperedLimb(12, 12, 9, data.shirt.color);


            ctx.translate(12, 0);
            drawTaperedLimb(12, 9, 6, data.shirt.color);


            ctx.translate(12, 0);
            if (data.gloves && data.gloves.style !== 'none') {
                ctx.fillStyle = data.gloves.color;
            } else {
                ctx.fillStyle = data.head.color;
            }
            ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(0, 0, 5, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();


            if (data.gloves && data.gloves.style === 'fingerless') {
                ctx.fillStyle = data.head.color;
                ctx.beginPath(); ctx.arc(0, 3, 3, 0, Math.PI * 2); ctx.fill();
            }

            ctx.restore();
        };

        drawArm(-1);
        drawArm(1);


        ctx.save();
        ctx.translate(0, -25);


        ctx.fillStyle = data.head.color; ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
        ctx.beginPath();
        if (data.head.shape === 'square') {
            ctx.rect(-16, -18, 32, 36);
        } else {
            ctx.arc(0, -5, 18, 0, Math.PI * 2);
        }
        ctx.fill(); ctx.stroke();


        ctx.save();
        if (data.head.shape === 'square') {
            const faceGrad = ctx.createLinearGradient(0, -18, 0, 18);
            faceGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
            faceGrad.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
            ctx.fillStyle = faceGrad;
            ctx.beginPath(); ctx.rect(-16, -18, 32, 36); ctx.fill();
        } else {
            const faceGrad = ctx.createRadialGradient(-4, -9, 2, 0, -5, 18);
            faceGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
            faceGrad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
            ctx.fillStyle = faceGrad;
            ctx.beginPath(); ctx.arc(0, -5, 18, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();



        const hasHelmet = data.helmet && data.helmet.style !== 'none';

        if (!hasHelmet && data.hair.style !== 'none') {
            ctx.fillStyle = data.hair.color;
            ctx.beginPath();
            if (data.hair.style === 'mohawk') {

                ctx.moveTo(-2, -20);
                ctx.lineTo(-4, -30); ctx.lineTo(-1, -23);
                ctx.lineTo(0, -36); ctx.lineTo(2, -23);
                ctx.lineTo(4, -30); ctx.lineTo(2, -20);
                ctx.closePath();
            }
            else if (data.hair.style === 'buzz') {
                ctx.arc(0, -10, 19.5, Math.PI, 0);
                ctx.lineTo(19.5, -4); ctx.lineTo(-19.5, -4);
                ctx.closePath();
            }
            else if (data.hair.style === 'long') {

                ctx.arc(0, -5, 21, Math.PI, 0);
                ctx.lineTo(21, 12);
                ctx.bezierCurveTo(21, 16, 17, 18, 17, 12);
                ctx.lineTo(17, 0);
                ctx.lineTo(-17, 0);
                ctx.lineTo(-17, 12);
                ctx.bezierCurveTo(-17, 18, -21, 16, -21, 12);
                ctx.closePath();
            }
            else if (data.hair.style === 'spiky') {

                ctx.moveTo(-18, -8);
                ctx.lineTo(-14, -22); ctx.lineTo(-10, -13);
                ctx.lineTo(-5, -26); ctx.lineTo(0, -14);
                ctx.lineTo(5, -26); ctx.lineTo(10, -13);
                ctx.lineTo(14, -22); ctx.lineTo(18, -8);
                ctx.arc(0, -8, 18.5, 0, Math.PI, true);
                ctx.closePath();
            }
            else if (data.hair.style === 'curly') {

                ctx.arc(-14, -13, 7, 0, Math.PI * 2);
                ctx.arc(-8, -18, 8, 0, Math.PI * 2);
                ctx.arc(0, -21, 8.5, 0, Math.PI * 2);
                ctx.arc(8, -18, 8, 0, Math.PI * 2);
                ctx.arc(14, -13, 7, 0, Math.PI * 2);
                ctx.arc(0, -8, 18, 0, Math.PI * 2);
                ctx.closePath();
            }
            else if (data.hair.style === 'dreads') {

                ctx.arc(0, -8, 19, Math.PI, 0);
                ctx.rect(-20, -8, 5, 22);
                ctx.rect(-15, -4, 4, 25);
                ctx.rect(15, -8, 5, 22);
                ctx.rect(11, -4, 4, 25);
                ctx.closePath();
            }
            else {

                ctx.arc(0, -8, 19, Math.PI, 0);
                ctx.closePath();
            }
            ctx.fill(); ctx.stroke();
        }



        const eyeY = 0;


        if (data.eyes.style !== 'scanner') {
            ctx.fillStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeStyle = '#111';

            const drawEyeBase = (x) => {
                ctx.save(); ctx.translate(x, eyeY);
                if (data.eyes.style === 'angry') ctx.rotate(x < 0 ? 0.2 : -0.2);
                ctx.beginPath(); ctx.ellipse(0, 0, 5, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.restore();
            };
            drawEyeBase(-6);
            drawEyeBase(6);


            ctx.fillStyle = data.eyes.color;
            ctx.beginPath(); ctx.arc(-6, eyeY, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(6, eyeY, 2.5, 0, Math.PI * 2); ctx.fill();
        } else {

            ctx.fillStyle = 'red'; ctx.strokeStyle = '#333';
            ctx.fillRect(-15, eyeY - 3, 30, 6);
            ctx.fillStyle = '#f00'; ctx.fillRect(-5, eyeY - 2, 10, 4);
        }


        if (data.eyebrows.style !== 'none') {
            const browY = eyeY - 6;
            ctx.lineWidth = 2; ctx.strokeStyle = data.eyebrows.color;
            ctx.beginPath();
            if (data.eyebrows.style === 'angry') {
                ctx.moveTo(-2, browY + 2); ctx.lineTo(-10, browY);
                ctx.moveTo(2, browY + 2); ctx.lineTo(10, browY);
            } else if (data.eyebrows.style === 'arched') {
                ctx.moveTo(-2, browY); ctx.quadraticCurveTo(-6, browY - 4, -10, browY + 1);
                ctx.moveTo(2, browY); ctx.quadraticCurveTo(6, browY - 4, 10, browY + 1);
            } else {
                ctx.moveTo(-2, browY); ctx.lineTo(-10, browY);
                ctx.moveTo(2, browY); ctx.lineTo(10, browY);
            }
            ctx.stroke();
        }


        const mouthY = 12;
        ctx.fillStyle = data.mouth.color; ctx.strokeStyle = data.mouth.color; ctx.lineWidth = 2;
        ctx.beginPath();
        if (data.mouth.style === 'smile') {
            ctx.arc(0, mouthY, 6, 0.2, Math.PI - 0.2); ctx.stroke();
        } else if (data.mouth.style === 'frown') {
            ctx.arc(0, mouthY + 6, 6, Math.PI + 0.2, -0.2); ctx.stroke();
        } else if (data.mouth.style === 'open') {
            ctx.ellipse(0, mouthY + 3, 4, 6, 0, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.moveTo(-4, mouthY + 3); ctx.lineTo(4, mouthY + 3); ctx.stroke();
        }


        if (data.glasses.style !== 'none') {
            ctx.fillStyle = data.glasses.color;
            if (data.glasses.style === 'shades') {
                ctx.globalAlpha = 0.9;
                ctx.fillRect(-16, eyeY - 3, 14, 8); ctx.fillRect(2, eyeY - 3, 14, 8);
                ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.moveTo(-16, eyeY); ctx.lineTo(16, eyeY); ctx.stroke();
                ctx.globalAlpha = 1.0;
            } else if (data.glasses.style === 'visor') {
                ctx.fillStyle = data.glasses.color;
                ctx.fillRect(-18, eyeY - 6, 36, 12);
            } else if (data.glasses.style === 'nerd') {
                ctx.strokeStyle = data.glasses.color; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(-8, eyeY, 7, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(8, eyeY, 7, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-1, eyeY); ctx.lineTo(1, eyeY); ctx.stroke();
            }
        }


        if (hasHelmet) {
            ctx.fillStyle = data.helmet.color;
            ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
            ctx.beginPath();
            if (data.helmet.style === 'tactical') {
                ctx.arc(0, -10, 20, Math.PI, 0);
                ctx.lineTo(20, -2); ctx.lineTo(-20, -2); ctx.closePath();
                ctx.fill(); ctx.stroke();

                ctx.beginPath(); ctx.moveTo(-18, -2); ctx.lineTo(-16, 10); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(18, -2); ctx.lineTo(16, 10); ctx.stroke();
            } else if (data.helmet.style === 'cap') {
                ctx.arc(0, -10, 19, Math.PI, 0);
                ctx.lineTo(19, -4); ctx.lineTo(-19, -4); ctx.closePath();
                ctx.fill(); ctx.stroke();

                ctx.fillStyle = '#111';
                ctx.beginPath(); ctx.rect(-18, -5, 36, 4); ctx.fill();
            } else if (data.helmet.style === 'pilot') {
                ctx.fillStyle = data.helmet.color;
                ctx.beginPath(); ctx.arc(0, -5, 22, Math.PI, 0); ctx.lineTo(22, 10); ctx.lineTo(-22, 10); ctx.closePath();
                ctx.fill(); ctx.stroke();
            }


            ctx.save();
            const helmetGrad = ctx.createLinearGradient(0, -32, 0, 10);
            helmetGrad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
            helmetGrad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
            ctx.fillStyle = helmetGrad;
            ctx.beginPath();
            if (data.helmet.style === 'tactical') {
                ctx.arc(0, -10, 20, Math.PI, 0);
                ctx.lineTo(20, -2); ctx.lineTo(-20, -2); ctx.closePath();
            } else if (data.helmet.style === 'cap') {
                ctx.arc(0, -10, 19, Math.PI, 0);
                ctx.lineTo(19, -4); ctx.lineTo(-19, -4); ctx.closePath();
            } else if (data.helmet.style === 'pilot') {
                ctx.arc(0, -5, 22, Math.PI, 0); ctx.lineTo(22, 10); ctx.lineTo(-22, 10); ctx.closePath();
            }
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    }
}
