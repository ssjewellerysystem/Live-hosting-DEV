from backend.extensions import db

class SiteSettingModel(db.Model):
    __tablename__ = 'site_settings'

    key = db.Column(db.String(100), primary_key=True)
    value = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            "key": self.key,
            "value": self.value
        }

class SiteSettingsProxy:
    def __init__(self):
        pass

    @property
    def maintenance_mode(self):
        setting = SiteSettingModel.query.filter_by(key='maintenance_mode').first()
        return setting.value == 'true' if setting else False

    @maintenance_mode.setter
    def maintenance_mode(self, val):
        setting = SiteSettingModel.query.filter_by(key='maintenance_mode').first()
        if not setting:
            setting = SiteSettingModel(key='maintenance_mode')
            db.session.add(setting)
        if isinstance(val, bool):
            setting.value = 'true' if val else 'false'
        else:
            setting.value = str(val)

    @property
    def maintenance_message(self):
        setting = SiteSettingModel.query.filter_by(key='maintenance_message').first()
        return setting.value if setting else "The website is temporarily under maintenance."

    @maintenance_message.setter
    def maintenance_message(self, val):
        setting = SiteSettingModel.query.filter_by(key='maintenance_message').first()
        if not setting:
            setting = SiteSettingModel(key='maintenance_message')
            db.session.add(setting)
        setting.value = val

    @property
    def maintenance_enabled_by_admin(self):
        setting = SiteSettingModel.query.filter_by(key='maintenance_enabled_by_admin').first()
        return setting.value if setting else ""

    @maintenance_enabled_by_admin.setter
    def maintenance_enabled_by_admin(self, val):
        setting = SiteSettingModel.query.filter_by(key='maintenance_enabled_by_admin').first()
        if not setting:
            setting = SiteSettingModel(key='maintenance_enabled_by_admin')
            db.session.add(setting)
        setting.value = val

    @property
    def maintenance_enabled_at(self):
        setting = SiteSettingModel.query.filter_by(key='maintenance_enabled_at').first()
        return setting.value if setting else ""

    @maintenance_enabled_at.setter
    def maintenance_enabled_at(self, val):
        setting = SiteSettingModel.query.filter_by(key='maintenance_enabled_at').first()
        if not setting:
            setting = SiteSettingModel(key='maintenance_enabled_at')
            db.session.add(setting)
        setting.value = val

class SiteSettingsQuery:
    def first(self):
        try:
            setting = SiteSettingModel.query.filter_by(key='maintenance_mode').first()
            if setting is None:
                return None
            return SiteSettingsProxy()
        except Exception:
            return None

class SiteSettings:
    query = SiteSettingsQuery()

