export const JetpackState = {
    OFF: 0,
    TAP: 1,
    BURST: 2,
    HOVER: 3
};

export class JetpackController {
    static CONFIG = {
        // Forces (Acceleration)
        tapForce: 1500,
        burstForce: 3000,
        hoverForce: 950, // Counteracts gravity (~600-900)

        // Fuel Consumption (per second)
        tapCost: 10,
        burstCost: 40,
        hoverCost: 15,

        // Recharge
        rechargeRateGround: 25,
        rechargeRateAir: 0,
        rechargeDelay: 1000, // ms after use

        // Physics Limits
        maxUpVelocity: -800,
        maxDownVelocity: 600
    };

    static update(entity, requestedState, delta, time) {
        // 1. Validation & Initialization
        if (!entity?.body) return JetpackState.OFF;

        // Defensive: Ensure fuel exists
        if (typeof entity.fuel !== 'number') {
            entity.fuel = entity.maxFuel ?? 100;
        }

        const cfg = this.CONFIG;
        const body = entity.body;
        const dt = delta / 1000; // Seconds

        // 2. Resolve State (Authority Check)
        let activeState = requestedState;

        // Force OFF if out of fuel
        if (entity.fuel <= 0 && activeState !== JetpackState.OFF) {
            activeState = JetpackState.OFF;
        }

        // 3. Apply Physics & Logic
        if (activeState === JetpackState.OFF) {
            this.handleOffState(entity, body, cfg, dt, time);
        } else {
            this.handleActiveState(entity, body, activeState, cfg, dt, time);
        }

        // 4. Global Physics Constraints (Symmetry)
        this.applyConstraints(body, cfg);

        // 5. Update Entity State Hooks
        entity.jetpackState = activeState;
        entity.isJetpacking = activeState !== JetpackState.OFF;

        return activeState;
    }

    static handleOffState(entity, body, cfg, dt, time) {
        // Reset specific acceleration (let world gravity take over)
        body.setAccelerationY(0);

        // Fuel Recharge Logic
        const timeSinceUse = time - (entity.lastJetpackTime || 0);

        if (timeSinceUse > cfg.rechargeDelay) {
            let rechargeAmount = 0;

            if (body.blocked.down) {
                rechargeAmount = cfg.rechargeRateGround * dt;
            } else {
                rechargeAmount = cfg.rechargeRateAir * dt;
            }

            if (rechargeAmount > 0) {
                entity.fuel = Math.min(entity.fuel + rechargeAmount, entity.maxFuel || 100);
            }
        }
    }

    static handleActiveState(entity, body, state, cfg, dt, time) {
        entity.lastJetpackTime = time;

        // Calculate Force
        let force = 0;
        let fuelCost = 0;

        switch (state) {
            case JetpackState.TAP:
                force = cfg.tapForce;
                fuelCost = cfg.tapCost;
                break;
            case JetpackState.BURST:
                force = cfg.burstForce;
                fuelCost = cfg.burstCost;
                break;
            case JetpackState.HOVER:
                force = cfg.hoverForce; // Counter-gravity
                // Intelligent Hover: Dampen velocity if moving up too fast
                if (body.velocity.y < -100) force *= 0.5;
                fuelCost = cfg.hoverCost;
                break;
        }

        // Apply Acceleration (Physics Engine handles integration)
        // Negative Y is UP
        body.setAccelerationY(-force);

        // Consume Fuel
        entity.fuel = Math.max(0, entity.fuel - (fuelCost * dt));
    }

    static applyConstraints(body, cfg) {
        // Clamp Vertical Velocity
        if (body.velocity.y < cfg.maxUpVelocity) {
            body.velocity.y = cfg.maxUpVelocity;
        } else if (body.velocity.y > cfg.maxDownVelocity) {
            body.velocity.y = cfg.maxDownVelocity;
        }
    }
}
