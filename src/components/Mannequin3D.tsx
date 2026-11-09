type Props = { gender: 'male' | 'female' }

export default function Mannequin3D({ gender }: Props) {
  const image = gender === 'male' ? '/models/closet-model-male.webp' : '/models/closet-model-female.webp'
  return (
    <div className={`mannequin-stage mannequin-stage-${gender}`}>
      <img
        src={image}
        alt={`AI-generated ${gender} model wearing a neutral outfit`}
        className="mannequin-model-image"
        loading="eager"
        decoding="async"
      />
      <span className="mannequin-look-label">SHARED DIGITAL MODEL</span>
    </div>
  )
}