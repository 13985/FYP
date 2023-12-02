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

    static void Shuffle(vector<int>& vec,const int len){
        for(register int i=std::min<int>(vec.size()-1,len);i>=0;i--){
            register int j=rand()%(i+1);
            register int temp=vec[j];
            vec[j]=vec[i];
            vec[i]=temp;
        }
    }

    static void Connections(vector<int>& others,const int source,const int edge_num){
        if(edge_num<=0){return;}

        Shuffle(others,edge_num+1);
        int edge=0;
        for(std::vector<int>::iterator it=others.begin();(edge<edge_num)&&(it<others.end());it++){
            if(*it==source||graph[*it].Have(source)||graph[source].Have(*it)){continue;}
            graph[source].Add(*it);
            edge++;
        }
        total_edge+=edge;
    }

private:
    Random();
};

/**
 * @brief 
 * vertex in k-shell can have almost k edges in total to any vertices in k+1 core
 * and any number of edges to vertice in shell below
 * 
 * the sum of edges from vertex to other vertices in same shell and higher kcore must >= k
 */


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
    Random::Shuffle(random_vertices,random_vertices.size());

    int min_num=shell+1;
    int bound=Random::Range(min_num,std::min<int>(num_of_vertex,4*min_num));
    int num_in_shell=bound;
    int min_edge=shell;

    vector<int> highers;
    vector<int> sources;

    if(num_in_shell>=2*min_num&&Random::Bool()){//can be subdivied to two clusters
        const int middle=Random::Range(min_num,bound-min_num);
        sources.clear();
        sources.reserve(middle);
        sources.insert(sources.end(),random_vertices.begin(),random_vertices.begin()+middle);
        for(int i=0;i<middle;i++){
            Random::Connections(sources,random_vertices[i],min_edge);
        }

        sources.clear();
        sources.reserve(bound-middle);
        sources.insert(sources.end(),random_vertices.begin()+middle,random_vertices.begin()+bound);
        for(int i=middle;i<bound;i++){
            Random::Connections(sources,random_vertices[i],min_edge);
        }
    }
    else{
        sources.clear();
        sources.reserve(bound);
        sources.insert(sources.end(),random_vertices.begin()+0,random_vertices.begin()+bound);
        for(int i=0;i<bound;i++){
            Random::Connections(sources,random_vertices[i],min_edge);
        }
    }
    highers.reserve(bound);
    highers.insert(highers.end(),random_vertices.begin(),random_vertices.begin()+bound);
    printf("at %d shell: %d\n",shell,num_in_shell);


    float factor=2;
    const float multiplier=1+(2.0/shell);
    min_edge--;
    for(int i=shell-1;i>0&&bound<num_of_vertex;i--,min_edge--,factor*=multiplier){
        num_in_shell=Random::Range(min_edge+1,std::min<int>(num_in_shell*factor,num_of_vertex-bound));
        const int next_bound=bound+num_in_shell;

        int cluster=0;
        for(int j=bound,k;j<next_bound;cluster++){
            if(next_bound-bound<min_edge+1){
                k=next_bound;
            }
            else{
                k=Random::Range(std::max<int>(0,j+min_edge-2),next_bound+1);
            }
            sources.clear();
            sources.reserve(k-j);
            sources.insert(sources.end(),random_vertices.begin()+j,random_vertices.begin()+k);

            const int min_to_higher=std::max<int>(0,min_edge-sources.size());
            for(;j<k;j++){
                Random::Connections(highers,random_vertices[j],min_to_higher);
                Random::Connections(sources,random_vertices[j],min_edge-min_to_higher);
            }
        }

        highers.reserve(next_bound);
        highers.insert(highers.end(),random_vertices.begin()+bound,random_vertices.begin()+next_bound);
        bound=next_bound;
        printf("at %d shell: %d (cluster %d)\n",i,num_in_shell,cluster);
    }
    printf("at %d shell: %d\n",0,num_of_vertex-bound);


    char name_buffer[100];
    const int len=sprintf(name_buffer,"../Graph/%s",argv[3]);
    name_buffer[len]=0;
    FILE* file=fopen(name_buffer,"w");
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