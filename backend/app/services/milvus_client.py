from pymilvus import MilvusClient, DataType
from app.config import settings

class MilvusConnection:
    _instance = None
    _client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MilvusConnection, cls).__new__(cls)
        return cls._instance

    def get_client(self) -> MilvusClient:
        if self._client is None:
            self._client = MilvusClient(uri=settings.MILVUS_URI)
        return self._client


milvus_conn = MilvusConnection()

def ensure_collection():
    """Ensure the Milvus collection exists and has the correct schema/indexes."""
    client = milvus_conn.get_client()
    collection_name = settings.MILVUS_COLLECTION_NAME

    if client.has_collection(collection_name=collection_name):
        return

    # Create schema
    schema = MilvusClient.create_schema(
        auto_id=True,
        enable_dynamic_field=False
    )

    schema.add_field(field_name="id", datatype=DataType.INT64, is_primary=True)
    schema.add_field(field_name="job_db_id", datatype=DataType.INT64)
    schema.add_field(field_name="position_id", datatype=DataType.VARCHAR, max_length=100)
    schema.add_field(field_name="dense_vector", datatype=DataType.FLOAT_VECTOR, dim=settings.MILVUS_DENSE_DIM)
    schema.add_field(field_name="sparse_vector", datatype=DataType.SPARSE_FLOAT_VECTOR)

    # Create index parameters
    index_params = client.prepare_index_params()

    index_params.add_index(
        field_name="dense_vector",
        index_type="HNSW",
        metric_type="COSINE",
        params={"M": 16, "efConstruction": 200}
    )

    index_params.add_index(
        field_name="sparse_vector",
        index_type="SPARSE_INVERTED_INDEX",
        metric_type="IP"
    )

    # Create collection
    client.create_collection(
        collection_name=collection_name,
        schema=schema,
        index_params=index_params
    )

    client.load_collection(collection_name)
