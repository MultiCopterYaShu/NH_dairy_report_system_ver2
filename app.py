from flask import Flask, render_template
from flask_cors import CORS
from backend.routes import auth, accounts, masters, reports
from backend.utils.init_data import initialize_data
import os

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
CORS(app)

# 初期データの作成
initialize_data()

# ルートの登録
app.register_blueprint(auth.bp)
app.register_blueprint(accounts.bp)
app.register_blueprint(masters.bp)
app.register_blueprint(reports.bp)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5010)

