export interface FaceRectangle {
	width: number,
	height: number,
	left: number,
	top: number
}

export interface FaceMakeup {
	eyeMakeup: boolean,
	faceMakeup: boolean
}

export class Face {
	public raw;
	public rect: FaceRectangle;
	public hair;
	public attrib;
	public age;
	public gender;
	public makeup: FaceMakeup;
	public emotion;
	public bald: number;

	//face - raw response data from azure, json parsed
	constructor(face: any) {
		this.raw = face;
		this.rect = {
			width: face.faceRectangle.width,
			height: face.faceRectangle.height,
			left: face.faceRectangle.left,
			top: face.faceRectangle.top
		};
		this.hair = face.faceAttributes.hair;
		this.attrib = face.faceAttributes;
		this.age = face.faceAttributes.age;
		this.gender = face.faceAttributes.gender;
		this.makeup = face.faceAttributes.makeup;
		this.emotion = face.faceAttributes.emotion;
		this.bald = face.faceAttributes.hair.bald;
	}

	//does face have eye makeup
	get eyeMakeup(): string {
		return (this.makeup.eyeMakeup) ? "Yes" : "No";
	}

	//does face have face makeup
	get faceMakeup(): string {
		return (this.makeup.faceMakeup) ? "Yes" : "No";
	}

	//formatted hair color confidence
	get formattedHair(): string {
		let val = [];
		for (let color of this.hair.hairColor) {
			val.push(`${color.color}: ${color.confidence * 100}% confident`);
		}
		return val.join(", ");
	}

	//formatted message about emotions
	get formattedEmotion(): string {
		return `${this.attrib.emotion.anger * 100}% anger, ${this.attrib.emotion.contempt * 100}% contempt, ${this.attrib.emotion.disgust * 100}% disgust, ${this.attrib.emotion.fear * 100}% fear, ${this.attrib.emotion.happiness * 100}% happiness, ${this.attrib.emotion.neutral * 100}% neutral, ${this.attrib.emotion.sadness * 100}% sadness, ${this.attrib.emotion.surprise * 100}% surprise`;
	}

	//message the users see
	get frontend(): string {
		return `${this.age} year old ${this.gender}\nSmile: ${this.attrib.smile * 100}%\nGlasses: ${this.attrib.glasses}\nEmotion: ${this.formattedEmotion}\nEye Makeup: ${this.eyeMakeup}, Face Makeup: ${this.faceMakeup}\nBald: ${this.bald}%\nHair: ${this.formattedHair}`;
	}
}