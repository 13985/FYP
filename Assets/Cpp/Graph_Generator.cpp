#include <stdio.h>
#include <time.h>
#include <stdlib.h>
#include <string>
#include <vector>
#include <stack>
#include <bitset>
#include <iostream>
#include <unordered_set>
using namespace std;

struct Random{
    /**
     * @brief return random number in [a,b)
     */
    inline static int Range(int a,int b){
        if(a>=b){return a;}
        return rand()%(b-a)+a;
    }

    inline static float Range(float a,float b){
        if(a>=b){return a;}
        return (rand()*(b-a)/RAND_MAX)+a;
    }

    inline static float Value(){
        return rand()/(float)RAND_MAX;
    }

    inline static bool Bool(){
        return rand()&1;
    }

    static void Shuffle(vector<int>& vec){
        for(register int i=vec.size()-1;i>=0;i--){
            register int j=rand()%(i+1);
            register int temp=vec[j];
            vec[j]=vec[i];
            vec[i]=temp;
        }
    }
private:
    Random();
};

struct Neighbor{
public:
    vector<int> vertices;
    unordered_set<int> exists;

    Neighbor(){};

    void Add(const int other){
        exists.insert(other);
        vertices.push_back(other);
    }

    inline bool Have(const int other){
        return exists.count(other)>0;
    }
};

vector<Neighbor> graph;
vector<int> random_vertices;
int total_edge;

/**
 * @brief 
 * vertex in k-shell can have almost k edges in total to any vertices in k+1 core
 * and any number of edges to vertice in shell below
 * 
 * the sum of edges from vertex to other vertices in same shell and higher kcore must >= k
 */

void Random_Edge(vector<int>& other_vertices,const vector<int>& sources,const int edge_num){
    for(int i=0;i<sources.size();i++){
        Random::Shuffle(other_vertices);
        int edge_created=0;
        for(int j=0;j<other_vertices.size()&&edge_created<edge_num;j++){
            const int from=sources[i],to=other_vertices[j];
            if(from==to){
                continue;
            }
            else if(graph[from].Have(to)==false&&graph[to].Have(from)==false){
                graph[from].Add(to);
                edge_created++;
            }
        }
        total_edge+=edge_created;
    }
}


void Random_Edge(vector<int>& other_vertices,const int source,const int required){
    if(required<=0){
        return;
    }
    Random::Shuffle(other_vertices);
    for(int j=0,edge_created=0;j<other_vertices.size()&&edge_created<required;j++){
        const int to=other_vertices[j];
        if(to==source){
            continue;
        }
        else if(graph[source].Have(to)==false&&graph[to].Have(source)==false){
            graph[source].Add(to);
            edge_created++;
        }
    }

    total_edge+=required;
}

int main(int argc,char**argv){
    if(argc!=4){
        printf("execpted argument:<.exe> <number of vertex> <shell> <output file name>");
        return 1;
    }
    srand(time(NULL));
    int num_of_vertex,shell;

    try{
        num_of_vertex=stoi(argv[1]);
        shell=stoi(argv[2]);
        if(shell<=0){
            printf("should should be >= 1");
            return 1;
        }
        else if(num_of_vertex<shell){
            printf("number of vertex should be >= to shell");
            return 1;
        }
    }
    catch(exception e){
        printf("fail to parse, reason: %s\n",e.what());
        return 1;
    }
    total_edge=0;

    graph.resize(num_of_vertex);
    random_vertices.resize(num_of_vertex);
    for(int i=0;i<num_of_vertex;i++){
        random_vertices[i]=i;
    }
    Random::Shuffle(random_vertices);

    int min_num=shell+1;
    int bound=Random::Range(min_num,std::min<int>(num_of_vertex,4*min_num));
    int num_in_shell=bound;
    int min_edge=shell;

    vector<int> candiates;
    vector<int> sources;

    if(num_in_shell>=2*min_num&&Random::Bool()){//can be subdivied to two clusters
        const int middle=Random::Range(min_num,bound-min_num);

        candiates.resize(middle);
        sources.resize(middle);
        for(int i=0;i<middle;i++){
            candiates[i]=random_vertices[i];
            sources[i-0]=random_vertices[i];
        }
        Random_Edge(candiates,sources,min_edge);

        candiates.resize(bound-middle);
        sources.resize(bound-middle);
        for(int i=middle;i<bound;i++){
            candiates[i-middle]=random_vertices[i];
            sources[i-middle]=random_vertices[i];
        }
        Random_Edge(candiates,sources,min_edge);

        candiates.clear();
        candiates.reserve(bound);
        candiates.insert(candiates.end(),random_vertices.begin(),random_vertices.begin()+bound);
    }
    else{
        candiates.resize(bound);
        sources.resize(bound);
        for(int i=0;i<bound;i++){
            candiates[i]=random_vertices[i];
            sources[i-0]=random_vertices[i];
        }
        Random_Edge(candiates,sources,min_edge);
    }
    printf("at %d shell: %d\n",shell,num_in_shell);

    float factor=2;
    const float multiplier=1+(2.0/shell);
    min_edge--;
    for(int i=shell-1;i>0&&bound<num_of_vertex;i--,min_edge--,factor*=multiplier){
        num_in_shell=Random::Range(0,std::min<int>(num_in_shell*factor,num_of_vertex-bound));
        const int next_bound=bound+num_in_shell;

        int cluster=0;
        for(int j=bound,k;j<next_bound;cluster++){
            k=Random::Range(j+1,next_bound+1);
            sources.clear();
            sources.insert(sources.end(),random_vertices.begin()+j,random_vertices.begin()+k);

            const int min_to_higher=std::max<int>(0,min_edge-sources.size());
            for(;j<k;j++){
                const int to_higher=Random::Range(min_to_higher,min_edge);
                const int remain=std::max<int>(0,min_edge-to_higher);
                Random_Edge(candiates,random_vertices[j],to_higher);
                Random_Edge(sources,random_vertices[j],Random::Range(remain,std::min<int>(sources.size(),remain+2)));
            }
        }

        candiates.reserve(next_bound);
        candiates.insert(candiates.end(),random_vertices.begin()+bound,random_vertices.begin()+next_bound);
        bound=next_bound;
        printf("at %d shell: %d (cluster %d)\n",i,num_in_shell,cluster);
    }
    printf("at %d shell: %d\n",0,num_of_vertex-bound);

    FILE* file=fopen(argv[3],"w");
    for(int i=0;i<num_of_vertex;i++){
        if(graph[i].vertices.size()>0){
            for(int j=0;j<graph[i].vertices.size();j++){
                fprintf(file,"%d %d\n",i,graph[i].vertices[j]);
            }
        }
        else{
            fprintf(file,"%d %d\n",i,i);
        }
    }
    fclose(file);
    printf("edge number:%d\n",total_edge);
    return 0;
}