import HeroCarousel from "../../HeroCarousel/HeroCarousel";
import "./carousel.styles.scss";

const Carousel = ({ slides = [], isLoading = false }) => {
  const ready = !isLoading && Array.isArray(slides) && slides.length > 0;

  return (
    <div className="pp-carousel">
      {ready ? (
        <HeroCarousel slides={slides} />
      ) : (
        <div className="pp-carousel-skel" aria-hidden="true" />
      )}
    </div>
  );
};

export default Carousel;
