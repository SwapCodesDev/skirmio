export class CharacterController {
    static createVisuals(scene, customization) {
        const container = scene.add.container(0, 0);

        // Normalize Data (Defaults)
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

        // Convert Hex Strings to Ints if necessary
        const getColor = (val) => {
            if (typeof val === 'string') return parseInt(val.replace('#', '0x'), 16);
            return val;
        };

        // Apply Color Conversion
        for (let part in data) {
            if (data[part].color) data[part].color = getColor(data[part].color);
        }

        // --- Helpers ---
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

        // --- Legs ---
        const leftLeg = scene.add.container(-4, 10);
        const rightLeg = scene.add.container(4, 10);

        const createLegGraphics = () => {
            const g = scene.add.graphics();
            // Leg
            createRoundedRect(g, -5, 0, 10, 18, 4, data.pants.color);
            // Boot
            g.fillStyle(data.boots.color, 1);
            g.beginPath(); g.moveTo(-5, 16); g.lineTo(5, 16); g.lineTo(8, 21); g.lineTo(-6, 21);
            g.closePath(); g.fillPath();
            g.lineStyle(1.5, 0x111111); g.strokePath();
            return g;
        };

        leftLeg.add(createLegGraphics());
        rightLeg.add(createLegGraphics());

        // --- Back Arm ---
        const backArm = scene.add.container(0, -7);
        const backArmG = scene.add.graphics();
        // Assuming holding gun, or idle? In game usually holding gun.
        // Let's make back arm support the gun or hang.
        // For simplicity reusing the "Front Arm" logic but mirrored or static?
        // Let's make it static hanging for now, or pointing if two-handed.
        // User snippet had "Hanging at sides" in one version, but aimed in another.
        // In Mini Militia, back arm usually supports.
        // We'll just define the graphics, rotation handled by Player class.

        // Upper Arm
        createTaperedLimb(backArmG, 12, 12, 9, data.shirt.color);
        // Forearm (Child container or just graphics offset?)
        // Graphics offset is easier for static pose.
        // Forearm
        // Transform for forearm needs to be relative. 
        // Let's draw it "straight" and let IK handle it? No IK here yet.
        // Just draw a fixed "holding" pose.
        // Upper
        // Forearm
        // Hand
        // Ideally we use containers for joints, but for performance/simplicity let's stick to rigid arms for now unless IK required.
        // User snippet used: scaleX for facing, aimAngle for rotation.
        // Let's stick to a rigid "Aiming Arm" graphics for simplicity.

        const createArmGraphics = (isFront) => {
            const g = scene.add.graphics();
            // Upper
            createTaperedLimb(g, 12, 12, 9, data.shirt.color);
            // Forearm (Hardcoded straight for now)
            const faX = 12;
            g.translateCanvas(faX, 0); // Internal context translate? Phaser Graphics doesn't support nested transforms easily unless we manage points.
            // Reset and draw relative points?
            // Actually, `createTaperedLimb` draws at 0,0.
            // Let's just create separate Graphics for Upper/Fore and put in container.
            return g;
        };

        // Redo Arm Strategy: Arm Container -> Upper(G) -> Fore(G) -> Hand(G)
        // Back Arm
        const backArmUpper = scene.add.graphics();
        createTaperedLimb(backArmUpper, 12, 12, 9, data.shirt.color);
        const backArmFore = scene.add.graphics();
        createTaperedLimb(backArmFore, 12, 9, 6, data.shirt.color);
        backArmFore.x = 12; // Length of upper
        const backHand = scene.add.circle(12, 0, 5, data.head.color); // Hand at end of Fore
        backHand.setStrokeStyle(1.5, 0x111111);

        backArm.add([backArmUpper, backArmFore, backHand]);
        backArm.setVisible(false); // Back arm is usually hidden by body or behind. 
        // Move Back Arm to Bottom of stack later.

        // --- Body ---
        const body = scene.add.container(0, 0);
        const bodyG = scene.add.graphics();
        // Torso
        createRoundedRect(bodyG, -14, -15, 28, 32, 10, data.shirt.color);

        // Vest
        if (data.shirt.style === 'tactical') {
            bodyG.fillStyle(0x3b5235, 1);
            bodyG.fillRoundedRect(-10, -12, 20, 20, 6);
            // Strap
            bodyG.lineStyle(2, 0x222222);
            bodyG.beginPath(); bodyG.moveTo(-9, -14); bodyG.lineTo(10, 10); bodyG.strokePath();
        } else if (data.shirt.style === 'suit') {
            bodyG.fillStyle(0x111111, 1); bodyG.fillRect(-1, -15, 2, 32);
            bodyG.fillStyle(0xffffff, 1);
            bodyG.beginPath(); bodyG.moveTo(-1, -15); bodyG.lineTo(-5, -5); bodyG.lineTo(5, -5); bodyG.lineTo(1, -15); bodyG.fillPath();
        }

        // Belt
        bodyG.fillStyle(0x222222, 1);
        bodyG.fillRect(-14, 10, 28, 5);
        bodyG.fillStyle(0x555555, 1);
        bodyG.fillRect(-4, 10, 8, 5);

        body.add(bodyG);

        // --- Head ---
        const headGroup = scene.add.container(0, -25);
        const headG = scene.add.graphics();
        headGroup.add(headG); // Add first so it's behind pupils

        // Face
        headG.fillStyle(data.head.color, 1);
        headG.lineStyle(2, 0x111111);
        if (data.head.shape === 'square') {
            headG.strokeRect(-16, -18, 32, 36);
            headG.fillRect(-16, -18, 32, 36);
        } else {
            headG.strokeCircle(0, -5, 18);
            headG.fillCircle(0, -5, 18);
        }

        // Hair (Layer 1)
        const hasHelmet = data.helmet.style !== 'none';
        if (!hasHelmet && data.hair.style !== 'none') {
            headG.fillStyle(data.hair.color, 1);
            headG.beginPath();
            if (data.hair.style === 'mohawk') {
                headG.moveTo(-2, -25); headG.lineTo(0, -35); headG.lineTo(2, -25);
                headG.rect(-2, -25, 4, 15);
            } else if (data.hair.style === 'buzz') {
                headG.arc(0, -10, 19.5, Math.PI, 0, false);
                headG.lineTo(19.5, -4); headG.lineTo(-19.5, -4);
            } else if (data.hair.style === 'long') {
                headG.arc(0, -5, 21, Math.PI, 0, false);
                headG.lineTo(21, 15); headG.lineTo(18, 15); headG.lineTo(18, 0);
                headG.lineTo(-18, 0); headG.lineTo(-18, 15); headG.lineTo(-21, 15);
            } else {
                headG.arc(0, -8, 19, Math.PI, 0, false);
            }
            headG.closePath(); headG.fillPath(); headG.strokePath();
        }

        // Face Elements
        // User requested Side View placement: Eyes at x=5, x=13
        const eyeY = -3;
        let mainPupilL, mainPupilR;

        // Eyes
        if (data.eyes.style !== 'scanner') {
            const drawEye = (x) => {
                headG.fillStyle(0xffffff, 1); headG.lineStyle(1.5, 0x111111);
                // User Snippet: radiusX=5.5, radiusY=7 -> Width=11, Height=14
                headG.fillEllipse(x, eyeY, 11, 14);
                headG.strokeEllipse(x, eyeY, 11, 14);
            };

            // Snippet Order: Front (13) then Rear (5)
            // This puts the Rear eye visually "on top" of the Front eye in the overlap
            drawEye(13); // Front
            drawEye(5);  // Rear

            // Pupils (Separate Objects)
            const createPupil = (x) => {
                const p = scene.add.circle(x, eyeY, 2.5, data.eyes.color);
                return p;
            };
            // Pupils order doesn't strictly matter as they don't overlap each other, 
            // but let's match X progression
            mainPupilL = createPupil(7);  // Corresponds to Rear Eye (5+2)
            mainPupilR = createPupil(15); // Corresponds to Front Eye (13+2)

            headGroup.add([mainPupilL, mainPupilR]);
        } else {
            // Scanner Visor (Side view?)
            // Shifted to front
            headG.fillStyle(0xff0000, 1); headG.lineStyle(1, 0x333333);
            headG.fillRect(2, eyeY - 3, 16, 6);
            headG.fillStyle(0xff0000, 1); headG.fillRect(8, eyeY - 2, 6, 4); // Glow
        }

        // Eyebrows
        if (data.eyebrows.style !== 'none') {
            const browY = eyeY - 6; // -9 relative to center
            headG.lineStyle(2, data.eyebrows.color);
            headG.beginPath();

            // Snippet: 0->9 and 9->18
            if (data.eyebrows.style === 'angry') {
                // Slanted down
                headG.moveTo(0, browY); headG.lineTo(9, browY + 3);
                headG.moveTo(9, browY); headG.lineTo(18, browY + 3);
            } else if (data.eyebrows.style === 'arched') {
                headG.moveTo(0, browY + 1); headG.quadraticBezierTo(4.5, browY - 3, 9, browY + 1);
                headG.moveTo(9, browY + 1); headG.quadraticBezierTo(13.5, browY - 3, 18, browY + 1);
            } else {
                // Normal (Snippet styleish)
                headG.moveTo(0, browY); headG.lineTo(9, browY + 3);
                headG.moveTo(9, browY); headG.lineTo(18, browY + 3);
            }
            headG.strokePath();
        }

        // Mouth (Side view shift)
        const mouthY = 12; // Lower face
        headG.lineStyle(2, data.mouth.color);
        headG.beginPath();
        // Shift x range to [5, 15] roughly
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

        // Glasses (Side view shift)
        if (data.glasses.style !== 'none') {
            headG.fillStyle(data.glasses.color, 1);
            if (data.glasses.style === 'shades') {
                headG.alpha = 0.9;
                // Cover eyes [5, 13] -> range [0, 18]
                headG.fillRect(0, eyeY - 3, 9, 8); // Left Lens
                headG.fillRect(10, eyeY - 3, 9, 8); // Right Lens
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

        // Helmet
        if (hasHelmet) {
            headG.fillStyle(data.helmet.color, 1);
            headG.lineStyle(2, 0x111111);
            headG.beginPath();
            if (data.helmet.style === 'tactical') {
                headG.arc(0, -10, 20, Math.PI, 0, false);
                headG.lineTo(20, -2); headG.lineTo(-20, -2); headG.closePath();
                headG.fillPath(); headG.strokePath();
                // Straps
                headG.beginPath(); headG.moveTo(-18, -2); headG.lineTo(-16, 10); headG.strokePath();
                headG.beginPath(); headG.moveTo(18, -2); headG.lineTo(16, 10); headG.strokePath();
            } else if (data.helmet.style === 'cap') {
                headG.arc(0, -10, 19, Math.PI, 0, false);
                headG.lineTo(19, -4); headG.lineTo(-19, -4); headG.closePath();
                headG.fillPath(); headG.strokePath();
                // Bill
                headG.fillStyle(0x111111, 1);
                headG.fillRect(-18, -5, 36, 4);
            } else if (data.helmet.style === 'pilot') {
                headG.arc(0, -5, 22, Math.PI, 0, false); headG.lineTo(22, 10); headG.lineTo(-22, 10);
                headG.fillPath(); headG.strokePath();
            }
        }



        // --- Front Arm (Weapon / Aiming) ---
        // Pivot at Shoulder (0, -7)
        const frontArm = scene.add.container(0, -7);
        const frontArmUpper = scene.add.graphics();
        createTaperedLimb(frontArmUpper, 12, 12, 9, data.shirt.color);

        const frontArmFore = scene.add.graphics();
        createTaperedLimb(frontArmFore, 12, 9, 6, data.shirt.color);
        frontArmFore.x = 12;

        const frontHand = scene.add.circle(24, 0, 5, data.head.color); // Hand
        if (data.gloves.style !== 'none') {
            frontHand.setFillStyle(data.gloves.color);
            if (data.gloves.style === 'fingerless') {
                // Simplified
            }
        }
        frontHand.setStrokeStyle(1.5, 0x111111);

        // Gun (M4 Carbine) - Ported from User Snippet
        const gunG = scene.add.graphics();
        // Snippet: translate(14, 2) scale(0.55, 0.55)
        gunG.setPosition(14, 2);
        gunG.setScale(0.55, 0.55);

        // Stock
        gunG.fillStyle(0x222222, 1);
        gunG.fillRect(-20, -4, 8, 12);
        gunG.fillRect(-20, 0, 20, 5);
        // Receiver
        gunG.fillRect(0, -8, 22, 13);
        // Grip
        gunG.save(); // Phaser graphics usually doesn't stack saves like context, but we can rotate/draw/rotateback
        // Actually Phaser Graphics doesn't support save/restore of transform state easily for sub-shapes.
        // We have to math the rotation or use a child graphics/container if we want complex local transforms.
        // For simple fillRects with rotation:
        // Grip: rotate(0.2) rect(2, 2, 7, 12)
        // We can use a helper or just approximate/ommit the slight rotation if it's too complex for single Graphics.
        // Or better: use `fillPoints` with rotated points.
        // Let's try to match closely.

        // Helper to rotate point
        const rot = (x, y, a) => {
            const c = Math.cos(a), s = Math.sin(a);
            return { x: x * c - y * s, y: x * s + y * c };
        };

        // Grip (Rotated 0.2 rads)
        // Rect 2,2 7x12
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

        // Mag (Translated 16, 2, Rotated 0.1)
        gunG.fillStyle(0x151515, 1);
        // Relative to gun origin (which is the graphics origin)
        // Trans 16,2 then Rot 0.1 then Rect 0,0,10,16
        // Effectively drawing a rect at 0,0 rotated 0.1, THEN shifted 16,2? 
        // Snippet: ctx.translate(16, 2); ctx.rotate(0.1); ctx.fillRect(0, 0, 10, 16);
        // So the rect top-left is at 16,2 (if no rot). With rot, it pivots around 16,2? No, pivots around 0,0 of the new context (16,2).
        // Yes.
        // So we draw a rect at 0,0 rotated 0.1, then add 16,2 to points.
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

        // Handguard
        gunG.fillStyle(0x333333, 1);
        gunG.fillRect(22, -6, 24, 10);
        // Rails
        gunG.fillStyle(0x111111, 1);
        gunG.fillRect(22, -8, 24, 2);
        gunG.fillRect(22, 4, 24, 2);
        // Barrel
        gunG.fillStyle(0x000000, 1);
        gunG.fillRect(46, -4, 6, 4);
        // Sights / Details
        gunG.fillStyle(0x111111, 1);
        gunG.fillRect(2, -12, 10, 4); // Rear sight
        gunG.fillRect(42, -11, 2, 5); // Front sight
        gunG.fillStyle(0xdd0000, 1);
        gunG.fillRect(12, -11, 2, 2); // Dot?

        // Add Gun BEFORE Arm Parts (so it's behind/held)
        frontArm.add([gunG, frontArmUpper, frontArmFore, frontHand]);

        // --- Assembly ---
        // Order: Back Arm < Back Leg < Body < Front Leg < Head < Front Arm
        // Note: Phaser containers render children in order.
        container.add([
            backArm,
            leftLeg, // Back Leg
            rightLeg, // Front Leg (Actually, usually legs match stance. Left/Right is fine)
            body,
            headGroup,
            frontArm
        ]);

        // Return refs for animation
        return {
            container,
            handContainer: frontArm,
            headGroup,
            legs: { left: leftLeg, right: rightLeg },
            pupils: { left: mainPupilL, right: mainPupilR }
        };
    }
}
