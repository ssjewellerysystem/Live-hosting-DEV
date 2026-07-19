import os
import time
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from backend.extensions import db
from backend.models.collection import CollectionModel
from backend.models.product import ProductModel
from backend.middleware.auth import admin_required
from backend.utils.audit import log_admin_action

collections_bp = Blueprint('collections', __name__)

# Cloudinary Setup
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

if all([CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET]):
    try:
        import cloudinary
        import cloudinary.uploader
        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET
        )
        CLOUDINARY_ENABLED = True
    except Exception:
        CLOUDINARY_ENABLED = False
else:
    CLOUDINARY_ENABLED = False

# Local Upload folder
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# 1. Public route: Get active collections with their assigned products
@collections_bp.route('', methods=['GET'])
def get_collections():
    try:
        collections = CollectionModel.query.filter_by(is_active=True).order_by(CollectionModel.display_order.asc()).all()
        result = []
        for col in collections:
            col_dict = col.to_dict()
            # Fetch products assigned to this collection using collection_id
            products = ProductModel.query.filter_by(collection_id=col.id).all()
            products_list = [p.to_dict() for p in products]
            col_dict['products'] = products_list
            col_dict['products_count'] = len(products_list)
            result.append(col_dict)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"message": f"Error fetching collections: {str(e)}"}), 500

# 2. Admin route: Get all collections (including inactive ones) with products count
@collections_bp.route('/all', methods=['GET'])
@admin_required
def get_all_collections():
    try:
        collections = CollectionModel.query.order_by(CollectionModel.display_order.asc()).all()
        result = []
        for col in collections:
            col_dict = col.to_dict()
            count = ProductModel.query.filter_by(collection_id=col.id).count()
            col_dict['products_count'] = count
            result.append(col_dict)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"message": f"Error fetching all collections: {str(e)}"}), 500

# 3. Admin route: Create a new collection
@collections_bp.route('', methods=['POST'])
@admin_required
def create_collection():
    try:
        data = request.get_json() or {}
        name = data.get("name")
        slug = data.get("slug")
        
        if not name or not slug:
            return jsonify({"message": "Collection Name and Slug are required."}), 400
            
        # Check slug uniqueness
        existing = CollectionModel.query.filter_by(slug=slug).first()
        if existing:
            return jsonify({"message": f"Collection with slug '{slug}' already exists."}), 400
            
        collection = CollectionModel(
            name=name,
            slug=slug,
            description=data.get("description", ""),
            banner_image=data.get("banner_image", ""),
            thumbnail_image=data.get("thumbnail_image", ""),
            desktop_banner=data.get("desktop_banner", ""),
            mobile_banner=data.get("mobile_banner", ""),
            preview_image=data.get("preview_image", ""),
            highlights=data.get("highlights", ""),
            rules=data.get("rules", ""),
            display_order=int(data.get("display_order", 0)),
            is_active=bool(data.get("is_active", True)),
            show_on_homepage=bool(data.get("show_on_homepage", True))
        )
        
        db.session.add(collection)
        db.session.commit()
        
        log_admin_action("Collection Created", "Collection Management", f"Created collection: '{name}'")
        
        return jsonify({
            "message": "Collection created successfully!",
            "collection": collection.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error creating collection: {str(e)}"}), 500

# 4. Admin route: Update an existing collection
@collections_bp.route('/<int:id>', methods=['PUT'])
@admin_required
def update_collection(id):
    try:
        collection = CollectionModel.query.get(id)
        if not collection:
            return jsonify({"message": "Collection not found."}), 404
            
        data = request.get_json() or {}
        
        if "name" in data:
            collection.name = data.get("name")
        if "slug" in data:
            slug = data.get("slug")
            # Ensure uniqueness
            existing = CollectionModel.query.filter_by(slug=slug).first()
            if existing and existing.id != collection.id:
                return jsonify({"message": f"Collection with slug '{slug}' already exists."}), 400
            collection.slug = slug
        if "description" in data:
            collection.description = data.get("description")
        if "banner_image" in data:
            collection.banner_image = data.get("banner_image")
        if "thumbnail_image" in data:
            collection.thumbnail_image = data.get("thumbnail_image")
        if "desktop_banner" in data:
            collection.desktop_banner = data.get("desktop_banner")
        if "mobile_banner" in data:
            collection.mobile_banner = data.get("mobile_banner")
        if "preview_image" in data:
            collection.preview_image = data.get("preview_image")
        if "highlights" in data:
            collection.highlights = data.get("highlights")
        if "rules" in data:
            collection.rules = data.get("rules")
        if "display_order" in data:
            collection.display_order = int(data.get("display_order", 0))
        if "is_active" in data:
            collection.is_active = bool(data.get("is_active", True))
        if "show_on_homepage" in data:
            collection.show_on_homepage = bool(data.get("show_on_homepage", True))
            
        db.session.commit()
        
        log_admin_action("Collection Updated", "Collection Management", f"Updated collection: '{collection.name}'")
        
        return jsonify({
            "message": "Collection updated successfully!",
            "collection": collection.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error updating collection: {str(e)}"}), 500

# 5. Admin route: Delete a collection (ONLY deletes mapping and collection, not products)
@collections_bp.route('/<int:id>', methods=['DELETE'])
@admin_required
def delete_collection(id):
    try:
        collection = CollectionModel.query.get(id)
        if not collection:
            return jsonify({"message": "Collection not found."}), 404
            
        name = collection.name
        
        # Clear collection_id for products in this collection
        ProductModel.query.filter_by(collection_id=id).update({ProductModel.collection_id: None})
        
        db.session.delete(collection)
        db.session.commit()
        
        log_admin_action("Collection Deleted", "Collection Management", f"Deleted collection: '{name}'")
        
        return jsonify({"message": "Collection deleted successfully!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error deleting collection: {str(e)}"}), 500

# 6. Admin route: Get products for assignment picker (assigned vs unassigned)
@collections_bp.route('/<int:id>/products', methods=['GET'])
@admin_required
def get_collection_products_assignment(id):
    try:
        collection = CollectionModel.query.get(id)
        if not collection:
            return jsonify({"message": "Collection not found."}), 404
            
        # Get all assigned product ids
        assigned_products = ProductModel.query.filter_by(collection_id=id).all()
        assigned_ids = {p.id for p in assigned_products}
        
        # Get all products in the store
        all_products = ProductModel.query.all()
        
        assigned_list = []
        unassigned_list = []
        
        for p in all_products:
            p_dict = p.to_dict()
            if p.id in assigned_ids:
                assigned_list.append(p_dict)
            else:
                unassigned_list.append(p_dict)
                
        return jsonify({
            "assigned": assigned_list,
            "unassigned": unassigned_list
        }), 200
    except Exception as e:
        return jsonify({"message": f"Error fetching collection products mapping: {str(e)}"}), 500

# 7. Admin route: Sync products inside this collection
@collections_bp.route('/<int:id>/products', methods=['POST'])
@admin_required
def sync_collection_products(id):
    try:
        collection = CollectionModel.query.get(id)
        if not collection:
            return jsonify({"message": "Collection not found."}), 404
            
        data = request.get_json() or {}
        product_ids = data.get("product_ids", [])
        
        # Remove existing mappings by setting collection_id to None
        ProductModel.query.filter_by(collection_id=id).update({ProductModel.collection_id: None})
        
        # Set new mappings
        if product_ids:
            ProductModel.query.filter(ProductModel.id.in_(product_ids)).update({ProductModel.collection_id: id}, synchronize_session=False)
            
        db.session.commit()
        
        log_admin_action("Collection Products Synced", "Collection Management", f"Synced products for collection '{collection.name}'")
        
        return jsonify({"message": "Products inside collection synced successfully!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error syncing collection products: {str(e)}"}), 500

# 8. Admin route: Upload collection image
@collections_bp.route('/upload', methods=['POST'])
@admin_required
def upload_collection_image():
    if 'image' not in request.files:
        return jsonify({"message": "No file uploaded."}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({"message": "No file selected."}), 400
        
    if CLOUDINARY_ENABLED:
        try:
            upload_result = cloudinary.uploader.upload(file)
            return jsonify({
                "message": "Collection image uploaded to Cloudinary successfully!",
                "url": upload_result.get("secure_url")
            }), 200
        except Exception as e:
            print(f"[CLOUDINARY] Upload failed, falling back to local: {e}")
            
    # Local fallback
    try:
        filename = secure_filename(file.filename)
        filename = f"collection_{int(time.time())}_{filename}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        url = f"/static/uploads/{filename}"
        return jsonify({
            "message": "Collection image uploaded locally successfully!",
            "url": url
        }), 200
    except Exception as ex:
        return jsonify({"message": f"Failed to upload collection image: {str(ex)}"}), 500
