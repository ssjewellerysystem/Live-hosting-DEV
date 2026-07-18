from backend.extensions import db
from datetime import datetime
import pytz
from backend.utils.timezone import format_iso_datetime

class CollectionModel(db.Model):
    __tablename__ = 'collections'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    slug = db.Column(db.String(150), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    banner_image = db.Column(db.String(500), nullable=True)
    thumbnail_image = db.Column(db.String(500), nullable=True)
    desktop_banner = db.Column(db.String(500), nullable=True)
    mobile_banner = db.Column(db.String(500), nullable=True)
    preview_image = db.Column(db.String(500), nullable=True)
    highlights = db.Column(db.Text, nullable=True)
    rules = db.Column(db.Text, nullable=True)
    display_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    show_on_homepage = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Asia/Kolkata')), onupdate=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))
    
    products = db.relationship('CollectionProductModel', back_populates='collection', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            "id": self.id,
            "_id": self.id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description or "",
            "banner_image": self.banner_image or "",
            "thumbnail_image": self.thumbnail_image or "",
            "desktop_banner": self.desktop_banner or "",
            "mobile_banner": self.mobile_banner or "",
            "preview_image": self.preview_image or "",
            "highlights": self.highlights or "",
            "rules": self.rules or "",
            "display_order": self.display_order,
            "is_active": self.is_active,
            "show_on_homepage": self.show_on_homepage,
            "created_at": format_iso_datetime(self.created_at) if self.created_at else "",
            "updated_at": format_iso_datetime(self.updated_at) if self.updated_at else ""
        }

class CollectionProductModel(db.Model):
    __tablename__ = 'collection_products'
    
    id = db.Column(db.Integer, primary_key=True)
    collection_id = db.Column(db.Integer, db.ForeignKey('collections.id', ondelete='CASCADE'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    
    collection = db.relationship('CollectionModel', back_populates='products')
    product = db.relationship('ProductModel')
