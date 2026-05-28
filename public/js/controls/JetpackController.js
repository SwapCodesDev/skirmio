export const JetpackState = {
    OFF: 0,
    TAP: 1,
    BURST: 2,
    HOVER: 3
};

export class JetpackController {
    static CONFIG = {

        tapForce: 1500,
        burstForce: 3000,
        hoverForce: 950,


        tapCost: 10,
        burstCost: 40,
        hoverCost: 15,


        rechargeRateGround: 25,
        rechargeRateAir: 0,
        rechargeDelay: 1000,


        maxUpVelocity: -800,
        maxDownVelocity: 600
    };

    static update(entity, requestedState, delta, time) {

        if (!entity?.body) return JetpackState.OFF;


        if (typeof entity.fuel !== 'number') {
            entity.fuel = entity.maxFuel ?? 100;
        }

        const cfg = this.CONFIG;
        const body = entity.body;
        const dt = delta / 1000;


        let activeState = requestedState;


        if (entity.fuel <= 0 && activeState !== JetpackState.OFF) {
            activeState = JetpackState.OFF;
        }


        if (activeState === JetpackState.OFF) {
            this.handleOffState(entity, body, cfg, dt, time);
        } else {
            this.handleActiveState(entity, body, activeState, cfg, dt, time);
        }


        this.applyConstraints(body, cfg);


        entity.jetpackState = activeState;
        entity.isJetpacking = activeState !== JetpackState.OFF;

        return activeState;
    }

    static handleOffState(entity, body, cfg, dt, time) {

        body.setAccelerationY(0);


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
                force = cfg.hoverForce;

                if (body.velocity.y < -100) force *= 0.5;
                fuelCost = cfg.hoverCost;
                break;
        }



        body.setAccelerationY(-force);


        entity.fuel = Math.max(0, entity.fuel - (fuelCost * dt));
    }

    static applyConstraints(body, cfg) {

        if (body.velocity.y < cfg.maxUpVelocity) {
            body.velocity.y = cfg.maxUpVelocity;
        } else if (body.velocity.y > cfg.maxDownVelocity) {
            body.velocity.y = cfg.maxDownVelocity;
        }
    }
}
