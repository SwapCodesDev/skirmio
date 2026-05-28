export class CharacterController {
    static createVisuals(scene, customization) {
        const container = scene.add.container(0, 0);


        const data = {
            head: { shape: 'human', color: 0xffe0bd, ...customization?.head },
            hair: { style: 'none', color: 0x4a4a4a, ...customization?.hair },
            eyes: { style: 'normal', color: 0x000000, ...customization?.eyes },
            eyebrows: { style: 'normal', color: 0x000000, ...customization?.eyebrows },
            mouth: { style: 'neutral', color: 0x000000, ...customization?.mouth },
            glasses: { style: 'none', color: 0x333333, ...customization?.glasses },
            shirt: { style: 'standard', color: 0x4a6741, ...customization?.shirt },
            pants: { style: 'standard', color: 0x333333, ...customization?.pants },
            boots: { style: 'standard', color: 0x111111, ...customization?.boots },
            helmet: { style: 'none', color: 0x3a4a35, ...customization?.helmet },
            gloves: { style: 'none', color: 0x222222, ...customization?.gloves }
        };


        const getColor = (val) => {
            if (typeof val === 'string') return parseInt(val.replace('#', '0x'), 16);
            return val;
        };


        for (let part in data) {
            if (data[part].color) data[part].color = getColor(data[part].color);
        }


        const createRoundedRect = (g, x, y, w, h, r, color, stroke = 0x111111) => {
            g.fillStyle(color, 1);
            g.fillRoundedRect(x, y, w, h, r);
            g.lineStyle(1.5, stroke);
            g.strokeRoundedRect(x, y, w, h, r);
        };

        const createTaperedLimb = (g, len, wStart, wEnd, color, stroke = 0x111111) => {
            g.fillStyle(color, 1);
            g.lineStyle(2, stroke);
            g.beginPath();
            g.arc(0, 0, wStart / 2, Math.PI / 2, -Math.PI / 2, false);
            g.lineTo(len, -wEnd / 2);
            g.arc(len, 0, wEnd / 2, -Math.PI / 2, Math.PI / 2, false);
            g.lineTo(0, wStart / 2);
            g.closePath();
            g.fillPath();
            g.strokePath();
        };


        const leftLeg = scene.add.container(-4, 10);
        const rightLeg = scene.add.container(4, 10);

        const createLegGraphics = () => {
            const g = scene.add.graphics();

            createRoundedRect(g, -5, 0, 10, 18, 4, data.pants.color);

            g.fillStyle(data.boots.color, 1);
            g.beginPath(); g.moveTo(-5, 16); g.lineTo(5, 16); g.lineTo(8, 21); g.lineTo(-6, 21);
            g.closePath(); g.fillPath();
            g.lineStyle(1.5, 0x111111); g.strokePath();
            return g;
        };

        leftLeg.add(createLegGraphics());
        rightLeg.add(createLegGraphics());


        const backArm = scene.add.container(0, -7);
        const backArmG = scene.add.graphics();









        createTaperedLimb(backArmG, 12, 12, 9, data.shirt.color);
















        const backArmUpper = scene.add.graphics();
        createTaperedLimb(backArmUpper, 12, 12, 9, data.shirt.color);
        const backArmFore = scene.add.graphics();
        createTaperedLimb(backArmFore, 12, 9, 6, data.shirt.color);
        backArmFore.x = 12;
        const backHand = scene.add.circle(12, 0, 5, data.head.color);
        backHand.setStrokeStyle(1.5, 0x111111);

        backArm.add([backArmUpper, backArmFore, backHand]);
        backArm.setVisible(false);



        const body = scene.add.container(0, 0);
        const bodyG = scene.add.graphics();

        createRoundedRect(bodyG, -14, -15, 28, 32, 10, data.shirt.color);


        if (data.shirt.style === 'tactical') {
            bodyG.fillStyle(0x3b5235, 1);
            bodyG.fillRoundedRect(-10, -12, 20, 20, 6);

            bodyG.lineStyle(2, 0x222222);
            bodyG.beginPath(); bodyG.moveTo(-9, -14); bodyG.lineTo(10, 10); bodyG.strokePath();
        } else if (data.shirt.style === 'suit') {
            bodyG.fillStyle(0x111111, 1); bodyG.fillRect(-1, -15, 2, 32);
            bodyG.fillStyle(0xffffff, 1);
            bodyG.beginPath(); bodyG.moveTo(-1, -15); bodyG.lineTo(-5, -5); bodyG.lineTo(5, -5); bodyG.lineTo(1, -15); bodyG.fillPath();
        }


        bodyG.fillStyle(0x222222, 1);
        bodyG.fillRect(-14, 10, 28, 5);
        bodyG.fillStyle(0x555555, 1);
        bodyG.fillRect(-4, 10, 8, 5);

        body.add(bodyG);


        const headGroup = scene.add.container(0, -25);
        const headG = scene.add.graphics();
        headGroup.add(headG);


        headG.fillStyle(data.head.color, 1);
        headG.lineStyle(2, 0x111111);
        if (data.head.shape === 'square') {
            headG.strokeRect(-16, -18, 32, 36);
            headG.fillRect(-16, -18, 32, 36);
        } else {
            headG.strokeCircle(0, -5, 18);
            headG.fillCircle(0, -5, 18);
        }


        const hasHelmet = data.helmet.style !== 'none';
        if (!hasHelmet && data.hair.style !== 'none') {
            headG.fillStyle(data.hair.color, 1);
            headG.beginPath();
            if (data.hair.style === 'mohawk') {

                headG.moveTo(-2, -20);
                headG.lineTo(-4, -30); headG.lineTo(-1, -23);
                headG.lineTo(0, -36); headG.lineTo(2, -23);
                headG.lineTo(4, -30); headG.lineTo(2, -20);
                headG.closePath();
            } else if (data.hair.style === 'buzz') {
                headG.arc(0, -10, 19.5, Math.PI, 0, false);
                headG.lineTo(19.5, -4); headG.lineTo(-19.5, -4);
                headG.closePath();
            } else if (data.hair.style === 'long') {

                headG.arc(0, -5, 21, Math.PI, 0, false);
                headG.lineTo(21, 12);
                headG.lineTo(17, 12);
                headG.lineTo(17, 0);
                headG.lineTo(-17, 0);
                headG.lineTo(-17, 12);
                headG.lineTo(-21, 12);
                headG.closePath();
            } else if (data.hair.style === 'spiky') {

                headG.moveTo(-18, -8);
                headG.lineTo(-14, -22); headG.lineTo(-10, -13);
                headG.lineTo(-5, -26); headG.lineTo(0, -14);
                headG.lineTo(5, -26); headG.lineTo(10, -13);
                headG.lineTo(14, -22); headG.lineTo(18, -8);
                headG.arc(0, -8, 18.5, 0, Math.PI, true);
                headG.closePath();
            } else if (data.hair.style === 'dreads') {

                headG.arc(0, -8, 19, Math.PI, 0, false);
                headG.fillRect(-20, -8, 5, 22);
                headG.fillRect(-15, -4, 4, 25);
                headG.fillRect(15, -8, 5, 22);
                headG.fillRect(11, -4, 4, 25);
                headG.closePath();
            } else if (data.hair.style === 'curly') {

                headG.arc(0, -8, 18, 0, Math.PI * 2, false);
                headG.arc(-14, -13, 7, 0, Math.PI * 2, false);
                headG.arc(-8, -18, 8, 0, Math.PI * 2, false);
                headG.arc(0, -21, 8.5, 0, Math.PI * 2, false);
                headG.arc(8, -18, 8, 0, Math.PI * 2, false);
                headG.arc(14, -13, 7, 0, Math.PI * 2, false);
                headG.closePath();
            } else {

                headG.arc(0, -8, 19, Math.PI, 0, false);
                headG.closePath();
            }
            headG.fillPath(); headG.strokePath();
        }



        const eyeY = -3;
        let mainPupilL, mainPupilR;


        if (data.eyes.style !== 'scanner') {
            const drawEye = (x) => {
                headG.fillStyle(0xffffff, 1); headG.lineStyle(1.5, 0x111111);

                headG.fillEllipse(x, eyeY, 11, 14);
                headG.strokeEllipse(x, eyeY, 11, 14);
            };



            drawEye(13);
            drawEye(5);


            const createPupil = (x) => {
                const p = scene.add.circle(x, eyeY, 2.5, data.eyes.color);
                return p;
            };


            mainPupilL = createPupil(7);
            mainPupilR = createPupil(15);

            headGroup.add([mainPupilL, mainPupilR]);
        } else {


            headG.fillStyle(0xff0000, 1); headG.lineStyle(1, 0x333333);
            headG.fillRect(2, eyeY - 3, 16, 6);
            headG.fillStyle(0xff0000, 1); headG.fillRect(8, eyeY - 2, 6, 4);
        }


        if (data.eyebrows.style !== 'none') {
            const browY = eyeY - 6;
            headG.lineStyle(2, data.eyebrows.color);
            headG.beginPath();


            if (data.eyebrows.style === 'angry') {

                headG.moveTo(0, browY); headG.lineTo(9, browY + 3);
                headG.moveTo(9, browY); headG.lineTo(18, browY + 3);
            } else if (data.eyebrows.style === 'arched') {
                headG.moveTo(0, browY + 1); headG.quadraticBezierTo(4.5, browY - 3, 9, browY + 1);
                headG.moveTo(9, browY + 1); headG.quadraticBezierTo(13.5, browY - 3, 18, browY + 1);
            } else {

                headG.moveTo(0, browY); headG.lineTo(9, browY + 3);
                headG.moveTo(9, browY); headG.lineTo(18, browY + 3);
            }
            headG.strokePath();
        }


        const mouthY = 12;
        headG.lineStyle(2, data.mouth.color);
        headG.beginPath();

        if (data.mouth.style === 'smile') {
            headG.arc(10, mouthY, 5, 0.2, Math.PI - 0.2, false);
        } else if (data.mouth.style === 'frown') {
            headG.arc(10, mouthY + 5, 5, Math.PI + 0.2, -0.2, false);
        } else if (data.mouth.style === 'open') {
            headG.fillStyle(data.mouth.color, 1);
            headG.fillEllipse(10, mouthY + 3, 4, 6);
        } else {
            headG.moveTo(6, mouthY + 3); headG.lineTo(14, mouthY + 3);
        }
        headG.strokePath();


        if (data.glasses.style !== 'none') {
            headG.fillStyle(data.glasses.color, 1);
            if (data.glasses.style === 'shades') {
                headG.alpha = 0.9;

                headG.fillRect(0, eyeY - 3, 9, 8);
                headG.fillRect(10, eyeY - 3, 9, 8);
                headG.lineStyle(2, 0x333333); headG.beginPath(); headG.moveTo(0, eyeY); headG.lineTo(19, eyeY); headG.strokePath();
                headG.alpha = 1;
            } else if (data.glasses.style === 'visor') {
                headG.fillRect(0, eyeY - 6, 20, 12);
            } else if (data.glasses.style === 'nerd') {
                headG.lineStyle(2, data.glasses.color);
                headG.strokeCircle(5, eyeY, 6); headG.strokeCircle(13, eyeY, 6);
                headG.beginPath(); headG.moveTo(8, eyeY); headG.lineTo(10, eyeY); headG.strokePath();
            }
        }


        if (hasHelmet) {
            headG.fillStyle(data.helmet.color, 1);
            headG.lineStyle(2, 0x111111);
            headG.beginPath();
            if (data.helmet.style === 'tactical') {
                headG.arc(0, -10, 20, Math.PI, 0, false);
                headG.lineTo(20, -2); headG.lineTo(-20, -2); headG.closePath();
                headG.fillPath(); headG.strokePath();

                headG.beginPath(); headG.moveTo(-18, -2); headG.lineTo(-16, 10); headG.strokePath();
                headG.beginPath(); headG.moveTo(18, -2); headG.lineTo(16, 10); headG.strokePath();
            } else if (data.helmet.style === 'cap') {
                headG.arc(0, -10, 19, Math.PI, 0, false);
                headG.lineTo(19, -4); headG.lineTo(-19, -4); headG.closePath();
                headG.fillPath(); headG.strokePath();

                headG.fillStyle(0x111111, 1);
                headG.fillRect(-18, -5, 36, 4);
            } else if (data.helmet.style === 'pilot') {
                headG.arc(0, -5, 22, Math.PI, 0, false); headG.lineTo(22, 10); headG.lineTo(-22, 10);
                headG.fillPath(); headG.strokePath();
            }
        }





        const frontArm = scene.add.container(0, -7);
        const frontArmUpper = scene.add.graphics();
        createTaperedLimb(frontArmUpper, 12, 12, 9, data.shirt.color);

        const frontArmFore = scene.add.graphics();
        createTaperedLimb(frontArmFore, 12, 9, 6, data.shirt.color);
        frontArmFore.x = 12;

        const frontHand = scene.add.circle(24, 0, 5, data.head.color);
        if (data.gloves.style !== 'none') {
            frontHand.setFillStyle(data.gloves.color);
            if (data.gloves.style === 'fingerless') {

            }
        }
        frontHand.setStrokeStyle(1.5, 0x111111);


        const gunG = scene.add.graphics();

        gunG.setPosition(14, 2);
        gunG.setScale(0.55, 0.55);


        gunG.fillStyle(0x222222, 1);
        gunG.fillRect(-20, -4, 8, 12);
        gunG.fillRect(-20, 0, 20, 5);

        gunG.fillRect(0, -8, 22, 13);

        gunG.save();









        const rot = (x, y, a) => {
            const c = Math.cos(a), s = Math.sin(a);
            return { x: x * c - y * s, y: x * s + y * c };
        };



        const drawRotRect = (g, x, y, w, h, ang) => {
            g.beginPath();
            const p1 = rot(x, y, ang);
            const p2 = rot(x + w, y, ang);
            const p3 = rot(x + w, y + h, ang);
            const p4 = rot(x, y + h, ang);
            g.moveTo(p1.x, p1.y); g.lineTo(p2.x, p2.y); g.lineTo(p3.x, p3.y); g.lineTo(p4.x, p4.y);
            g.closePath(); g.fillPath();
        };
        drawRotRect(gunG, 2, 2, 7, 12, 0.2);


        gunG.fillStyle(0x151515, 1);







        const drawMag = () => {
            const r = 0.1;
            const tx = 16, ty = 2;
            const pts = [
                { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 16 }, { x: 0, y: 16 }
            ].map(p => {
                const pr = rot(p.x, p.y, r);
                return { x: pr.x + tx, y: pr.y + ty };
            });
            gunG.beginPath(); gunG.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < 4; i++) gunG.lineTo(pts[i].x, pts[i].y);
            gunG.closePath(); gunG.fillPath();
        };
        drawMag();


        gunG.fillStyle(0x333333, 1);
        gunG.fillRect(22, -6, 24, 10);

        gunG.fillStyle(0x111111, 1);
        gunG.fillRect(22, -8, 24, 2);
        gunG.fillRect(22, 4, 24, 2);

        gunG.fillStyle(0x000000, 1);
        gunG.fillRect(46, -4, 6, 4);

        gunG.fillStyle(0x111111, 1);
        gunG.fillRect(2, -12, 10, 4);
        gunG.fillRect(42, -11, 2, 5);
        gunG.fillStyle(0xdd0000, 1);
        gunG.fillRect(12, -11, 2, 2);


        frontArm.add([gunG, frontArmUpper, frontArmFore, frontHand]);




        container.add([
            backArm,
            leftLeg,
            rightLeg,
            body,
            headGroup,
            frontArm
        ]);


        return {
            container,
            handContainer: frontArm,
            headGroup,
            legs: { left: leftLeg, right: rightLeg },
            pupils: { left: mainPupilL, right: mainPupilR }
        };
    }
}
