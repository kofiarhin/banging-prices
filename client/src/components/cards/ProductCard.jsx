import { Link } from "react-router-dom";
import { fmtCurrency } from "../../utils/formatters";
import "./product-card.styles.scss";

const ProductCard = ({ product }) => {
  if (!product?._id) return null;

  return (
    <Link className="pp-card" to={`/products/${product._id}`}>
      <div className="pp-card-media">
        {product.discountPercent ? (
          <div className="pp-badge">-{product.discountPercent}%</div>
        ) : null}

        <img
          className="pp-card-img"
          src={product.image}
          alt={product.title}
          loading="lazy"
        />
      </div>

      <div className="pp-card-details">
        <div className="pp-card-store">
          {product.storeName || product.store}
        </div>

        <div className="pp-card-title">{product.title}</div>

        <div className="pp-card-price">
          <div className="pp-card-now">
            {fmtCurrency(product.currency, product.price)}
          </div>

          {product.originalPrice ? (
            <div className="pp-card-was">
              {fmtCurrency(product.currency, product.originalPrice)}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
