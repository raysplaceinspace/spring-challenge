export const Tau = 2 * Math.PI;

export function degreeToRad(degree: number) {
    return Tau * (degree / 360.);
}

export function radToDegree(rad: number) {
    return 360. * (rad / Tau);
}

export function turnTowards(currentAngle: number, targetAngle: number, turnRate: number) {
	let delta = angleDelta(currentAngle, targetAngle);
	const turnDelta = Math.min(Math.abs(delta), turnRate) * Math.sign(delta);
	const newAngle = currentAngle + turnDelta;
	return newAngle;
}

export function angleDelta(currentAngle: number, targetAngle: number) {
	let delta = targetAngle - currentAngle;
	while (delta > Math.PI) {
		delta -= 2 * Math.PI;
	}
	while (delta < -Math.PI) {
		delta += 2 * Math.PI;
	}

	return delta;
}